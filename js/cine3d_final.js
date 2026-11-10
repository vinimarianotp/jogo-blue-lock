// ============================================================================
// CUTSCENES EM 3D — o fim da carreira (js/cine_final.js e js/cine_final_franca.js
// refeitos no 3D). Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   convocation_call  • a convocação: o telão do Ego no saguão → os nomes → a camisa 11
//   camp_night        • a madrugada no hotel da seleção (montado na área vazia)
//   rin_final_duel    • o último duelo: o campo do Blue Lock na chuva
//   rin_final_end     • depois do duelo: deitados na grama, o placar, o Nº 1
//   ballon_dor        • a noite da Bola de Ouro em Paris (área vazia)
//   epilogue_destinies• o destino de cada um (um cenário para cada um)
//   wc_final_goal     • o gol dos quatro egos na final da Copa (o campo como Catedral)
// Ajudantes daqui ficam no CutsceneEngine com o prefixo "c3f" (a cine3d_bola_ouro usa).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;
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
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  // quadros da corrida (o 0 é a piscada)
  const RUNF = (f, sp = 3) => [3, 7, 11, 15][Math.floor(f / sp) % 4];

  // ==========================================================================
  // AJUDANTES (prefixo c3f, ficam no CE para a cine3d_bola_ouro)
  // ==========================================================================
  // Canvas guardado (criado UMA vez; draw só na primeira vez)
  const CV = new Map();
  const canvas = (key, w, h, draw) => {
    let c = CV.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      if (draw) draw.call(CE, g, w, h);
      CV.set(key, c);
    }
    return c;
  };
  // Canvas que muda (telão, letreiro): redesenha a cada "every" quadros; devolve
  // { cv, dirty } para passar no K.quad
  const LIVE = new Map();
  const live = (key, w, h, S, every, draw) => {
    const cv = canvas('live|' + key, w, h);
    const stamp = `${CE._cineRun || 0}|${S.phase}|${Math.floor(S.t / every)}`;
    let dirty = false;
    if (LIVE.get(key) !== stamp) {
      LIVE.set(key, stamp);
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, w, h);
      g.imageSmoothingEnabled = false;
      draw.call(CE, g, w, h);
      dirty = true;
    }
    return { cv, dirty };
  };
  // Boneco numa pose que o 3D não tem (deitado, ajoelhado, braços cruzados...): desenhado
  // uma vez com os ajudantes 2D num canvas e mostrado em pé com K.sprite (ou K.floor).
  // fn(g, x, feet, size) desenha com size = 180 e os pés em (x, feet). k = escala do ator.
  const POSE_S = 180;
  const POSE_W = 420;
  const POSE_H = 300;
  const pose = (key, fn) =>
    canvas('pose|' + key, POSE_W, POSE_H, (g) => {
      fn.call(CE, g, POSE_W / 2, POSE_H - 24, POSE_S);
    });
  // tamanho em ladrilhos de 1 px do boneco desenhado com size 180 (mesma escala do ator k 0,9)
  const PX = (0.9 * 72) / 66 / POSE_S;
  const poseSprite = (K, cv, o) => {
    const k = (o.k || 0.9) / 0.9;
    K.sprite(cv, { x: o.x, y: o.y, z: o.z || 0, w: POSE_W * PX * k, h: POSE_H * PX * k, foot: 24 / POSE_H, light: o.light, alpha: o.alpha, shadow: o.shadow || 0 });
  };
  // Pose deitada no chão (para câmera de cima): o canvas vai deitado com K.floor
  const poseFloor = (K, cv, o) => {
    const k = (o.k || 0.9) / 0.9;
    const w = POSE_W * PX * k;
    const h = POSE_H * PX * k;
    K.floor({ x0: o.x - w / 2, y0: o.y - h / 2, x1: o.x + w / 2, y1: o.y + h / 2, z: o.z || 0.02, img: cv, color: '#ffffff', light: o.light });
  };
  // Figurantes (plateia, imprensa): sempre os mesmos, sorteados uma vez
  const extras = (seed, n, o = {}) => {
    const key = `extras|${seed}|${n}|${JSON.stringify(o)}`;
    let L = CV.get(key);
    if (L) return L;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = o.hair || A.CREATOR_HAIR_COLORS || ['#1b2340'];
    const clothes = o.clothes || ['#111827', '#1f2937', '#0f172a', '#27272a'];
    let s = seed * 7919 + 13;
    const r = (m) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % m);
    L = [];
    for (let i = 0; i < n; i++) {
      const cd = { name: `fig${seed}_${i}`, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], number: 1 + r(98) };
      if (o.kit) Object.assign(cd, o.kit);
      else Object.assign(cd, { outfit: 'casual', clothesColor: clothes[r(clothes.length)], jerseyPrimary: '#111827', jerseySecondary: '#e5e7eb' });
      L.push(cd);
    }
    CV.set(key, L);
    return L;
  };
  // Telão: placa acesa com moldura escura (x, y = meio embaixo; ang = para onde olha)
  const screenQuad = (K, o) => {
    const nx = Math.cos(o.ang);
    const ny = Math.sin(o.ang);
    K.quad({ x: o.x - nx * 0.03, y: o.y - ny * 0.03, z: o.z - 0.06, w: o.w + 0.14, h: o.h + 0.12, ang: o.ang, color: o.frame || '#05080f' });
    pic(K, { x: o.x, y: o.y, z: o.z, w: o.w, h: o.h, ang: o.ang, img: o.cv, dirty: o.dirty, em: true, color: '#ffffff', alpha: o.alpha ?? 1 });
  };
  // Placa com imagem: o K.quad do kit espelha a textura (o u corre ao contrário olhando de
  // frente); virando a placa 180° a imagem fica certa (a placa aparece dos dois lados)
  const pic = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang || 0) + Math.PI }));
  // Ponto da tela de um lugar do mundo (ou null)
  const scr = (K, x, h, y) => K.screen(x, h, y);
  // Chuva na tela (duas camadas, como na 2D)
  const rain = (ctx, S, a = 1) => {
    CE.cineRain(ctx, S.W, S.H, S.t, 0.28 * a, 170, 0.2);
    CE.cineRain(ctx, S.W, S.H, S.t * 1.4 + 300, 0.42 * a, 50, 0.24);
  };
  // Escurece a imagem embaixo/em cima (para letreiros lerem)
  const shade = (ctx, S, y0, y1, a0, a1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(1,3,11,${a0})`);
    g.addColorStop(1, `rgba(1,3,11,${a1})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), S.W, Math.abs(y1 - y0));
  };
  // Céu de cidade à noite pintado num canvas (fundo de teatro bem longe)
  const cityCv = (key, o = {}) =>
    canvas('city|' + key, 1024, 384, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']]);
      CE.cineCity(g, w, h - 6, 170, o.far || '#0b1a36', o.win1 || 'rgba(147,197,253,0.45)', o.seed || 3, 0);
      CE.cineCity(g, w, h, 110, o.near || '#050b1a', o.win2 || 'rgba(253,224,71,0.55)', (o.seed || 3) + 3, 120);
    });
  // Lua/brilho redondo em canvas (sprite aceso)
  const moonCv = () =>
    canvas('moon', 64, 64, (g) => {
      CE.cineGlow(g, 32, 32, 30, 'rgba(191,219,254,0.5)');
      g.fillStyle = '#e2e8f0';
      g.beginPath();
      g.arc(32, 32, 12, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(148,163,184,0.5)';
      g.beginPath();
      g.arc(28, 29, 3, 0, TAU);
      g.arc(36, 36, 2, 0, TAU);
      g.fill();
    });
  const glowCv = (color) =>
    canvas('glow|' + color, 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
  // Feixe de luz (cone achatado): placa acesa e transparente
  const beamCv = (rgb) =>
    canvas('beam|' + rgb, 64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, `rgba(${rgb},0.55)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w * 0.42, 0);
      g.lineTo(w * 0.58, 0);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fill();
    });

  // Os bonecos em pé (billboards) do motor viram para o ângulo da câmera do MAPA (Hub.camA),
  // não para a câmera da cena: com a câmera da cena olhando para outro lado eles ficavam de
  // perfil (invisíveis). Durante o quadro o Hub.camA acompanha a câmera da cena; o overlay
  // (que roda logo depois do desenho) devolve o ângulo do mapa.
  const camFix = (K) => {
    if (K._c3fCam) return;
    K._c3fCam = true;
    const c0 = K.cam;
    K.cam = function (e, l, f) {
      c0.call(this, e, l, f);
      const H = window.Hub;
      if (H._c3fA === undefined) H._c3fA = H.camA;
      const dx = l[0] - e[0];
      const dy = l[2] - e[2];
      if (Math.abs(dx) + Math.abs(dy) > 1e-4) H.camA = Math.atan2(dy, dx);
    };
  };
  const camBack = () => {
    const H = window.Hub;
    if (H && H._c3fA !== undefined) {
      H.camA = H._c3fA;
      H._c3fA = undefined;
    }
  };

  Object.assign(CE, {
    c3fCamFix: camFix,
    c3fCamBack: camBack,
    c3fCanvas: canvas,
    c3fLive: live,
    c3fPose: pose,
    c3fPoseSprite: poseSprite,
    c3fPoseFloor: poseFloor,
    c3fExtras: extras,
    c3fScreen: screenQuad,
    c3fRain: rain,
    c3fShade: shade,
    c3fCity: cityCv,
    c3fMoon: moonCv,
    c3fGlowCv: glowCv,
    c3fBeam: beamCv
  });

  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_RIN = { jerseyPrimary: '#0f766e', jerseySecondary: '#020617' };
  const CONV_NAMES = [
    ['SAE ITOSHI', 'MEIA • CAPITÃO', 'sae'], ['RIN ITOSHI', 'ATACANTE', 'rin'], ['RYUSEI SHIDOU', 'ATACANTE', 'shidou'],
    ['MEGURU BACHIRA', 'PONTA', 'bachira'], ['SEISHIRO NAGI', 'ATACANTE', 'nagi'], ['HYOMA CHIGIRI', 'PONTA', 'chigiri'],
    ['GIN GAGAMARU', 'GOLEIRO'], ['RENSUKE KUNIGAMI', 'ATACANTE'], ['REO MIKAGE', 'MEIA'], ['SHOUEI BAROU', 'ATACANTE'],
    ['YO HIORI', 'MEIA'], ['EITA OTOYA', 'PONTA'], ['TABITO KARASU', 'VOLANTE'], ['KENYU YUKIMIYA', 'PONTA'],
    ['JYUBEI ARYU', 'ZAGUEIRO'], ['ZANTETSU TSURUGI', 'LATERAL'], ['OLIVER AIKU', 'ZAGUEIRO'], ['IKKI NIKO', 'VOLANTE'],
    ['AOSHI TOKIMITSU', 'ZAGUEIRO'], ['KURONA RANZE', 'MEIA'], ['GURIMU IGARASHI', 'MEIA'], ['NIJIRO NANASE', 'MEIA'],
    ['JIN KIYORA', 'ZAGUEIRO'], ['JINGO RAICHI', 'ZAGUEIRO'], ['SHUTO SENDO', 'ATACANTE']
  ];

  // ==========================================================================
  // 1. A CONVOCAÇÃO — saguão da sede (tema da seleção): o telão do Ego, os nomes
  // ==========================================================================
  // o telão grande na parede norte do saguão
  const TEL = { x: 25, y: 9.07, z: 0.3, w: 4.6, h: 1.3, ang: Math.PI / 2 };
  // fila dos convocados na frente do telão (os 6 primeiros + você no fim)
  const ROW_Y = 10.6;
  const ROW_X = [21.9, 22.9, 23.9, 24.9, 25.9, 26.9, 28.1];
  const convPos = (t) => {
    if (t < 132) {
      const c = Math.floor(t / 22);
      return c - 1 + ease(seg(t - c * 22, 0, 9));
    }
    return 5 + 19 * easeIO(seg(t, 132, 200));
  };
  function convList(g, w, h, pos) {
    CE.cineGradient(g, 0, 0, w, h, [[0, '#031327'], [1, '#020814']]);
    CE.finFillPat(g, 'dots', 0, 0, w, h, 0.6);
    const rowH = 34;
    const cy = h / 2 + 18;
    g.fillStyle = 'rgba(0,245,212,0.16)';
    g.fillRect(0, cy - rowH / 2, w, rowH);
    g.fillStyle = '#00f5d4';
    g.fillRect(0, cy - rowH / 2, 5, rowH);
    const n = CONV_NAMES.length;
    g.textBaseline = 'middle';
    for (let i = Math.max(0, Math.floor(pos) - 5); i <= Math.min(n, Math.ceil(pos) + 5); i++) {
      const y = cy + (i - pos) * rowH;
      if (y < 44 || y > h + 20) continue;
      const d = Math.abs(i - pos);
      const isYou = i === n;
      const [nm, role] = isYou ? ['? ? ?', 'CAMISA 11'] : CONV_NAMES[i];
      g.globalAlpha = Math.max(0.14, 1 - d * 0.22);
      g.textAlign = 'left';
      g.font = '900 13px "Segoe UI", sans-serif';
      g.fillStyle = d < 0.5 ? '#00f5d4' : '#64748b';
      g.fillText(String(i + 1).padStart(2, '0'), 20, y);
      g.font = `italic 900 ${d < 0.5 ? 26 : 20}px "Segoe UI", sans-serif`;
      g.fillStyle = isYou ? '#facc15' : d < 0.5 ? '#ffffff' : '#cbd5e1';
      g.fillText(nm, 58, y);
      g.font = '800 11px "Segoe UI", sans-serif';
      g.textAlign = 'right';
      g.fillStyle = isYou ? '#facc15' : '#7dd3fc';
      g.fillText(role, w - 20, y);
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(2,6,23,0.92)';
    g.fillRect(0, 0, w, 40);
    g.fillStyle = '#00f5d4';
    g.fillRect(0, 38, w, 2);
    g.textAlign = 'left';
    g.font = '900 15px "Segoe UI", sans-serif';
    g.fillStyle = '#e2e8f0';
    g.fillText('CONVOCAÇÃO OFICIAL • SELEÇÃO JAPONESA • COPA DO MUNDO', 18, 20);
    const cnt = Math.min(25, Math.max(1, Math.round(pos) + 1));
    CE.finPixelText(g, `${String(cnt).padStart(2, '0')}/26`, w - 16, 20, 2.2, '#00f5d4', 'right');
    CE.finFillPat(g, 'scan', 0, 0, w, h, 0.5);
  }
  // os óculos do Ego no telão, de perto (o "11" refletido nas lentes)
  function convGlasses(g, w, h, t) {
    const ego = CE.getSpeakerCharData('EGO');
    CE.cineGradient(g, 0, 0, w, h, [[0, '#06283a'], [1, '#020b16']]);
    const uw = 30;
    const U = w / uw;
    const uh = h / U;
    const ux = 18 - uw / 2;
    const uy = 10.3 - uh / 2;
    CE.finCrop(g, ego, {}, ux, uy, uw, uh, 0, 0, w, h);
    const toX = (x) => (x - ux) * U;
    const toY = (y) => (y - uy) * U;
    [12.4, 19.4].forEach((gx, i) => {
      const lx = toX(gx + 0.7);
      const ly = toY(9.3);
      const lw = 2.8 * U;
      const lh = 2.1 * U;
      g.save();
      g.beginPath();
      g.rect(lx, ly, lw, lh);
      g.clip();
      g.fillStyle = 'rgba(0,245,212,0.14)';
      g.fillRect(lx, ly, lw, lh);
      if (t > 62) {
        g.globalAlpha = 0.8 * seg(t, 62, 92);
        CE.finPixelText(g, '11', lx + lw * 0.55, ly + lh * 0.55, U * 0.16, '#5eead4');
        g.globalAlpha = 1;
      }
      const gp = seg(t, 18 + i * 6, 58 + i * 6);
      if (gp > 0 && gp < 1) {
        const bx = lerp(lx - lw, lx + lw * 1.6, gp);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        poly(g, [[bx, ly], [bx + lw * 0.22, ly], [bx - lw * 0.18, ly + lh], [bx - lw * 0.4, ly + lh]]);
        g.fill();
      }
      g.restore();
    });
    g.fillStyle = 'rgba(0,245,212,0.07)';
    g.fillRect(0, 0, w, h);
    CE.finFillPat(g, 'scan', 0, 0, w, h, 0.7);
    const by = ((t * 2) % (h + 80)) - 40;
    const gr = g.createLinearGradient(0, by - 30, 0, by + 30);
    gr.addColorStop(0, 'rgba(0,245,212,0)');
    gr.addColorStop(0.5, 'rgba(0,245,212,0.1)');
    gr.addColorStop(1, 'rgba(0,245,212,0)');
    g.fillStyle = gr;
    g.fillRect(0, by - 30, w, 60);
  }
  // a camisa 11 pendurada (com o seu nome) e a plaquinha do armário
  const jerseyCv = (name) =>
    canvas('jersey|' + name, 160, 184, (g) => {
      g.drawImage(CE.finJerseyCv('11'), 0, 0, 160, 184);
      CE.finPixelText(g, name, 80, 48, 2.0, '#f8fafc', 'center', 120);
    });
  const plateCv = (name) =>
    canvas('plate|' + name, 256, 40, (g, w, h) => {
      g.fillStyle = '#cbd5e1';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#334155';
      g.fillRect(0, h - 3, w, 3);
      g.font = '900 20px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#0f172a';
      g.fillText(`11 • ${name}`.slice(0, 22), w / 2, h / 2);
    });
  const hangerCv = () =>
    canvas('hanger', 128, 40, (g) => {
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(64, 24);
      g.lineTo(64, 10);
      g.arc(72, 10, 8, Math.PI, Math.PI * 1.9);
      g.moveTo(64, 24);
      g.lineTo(8, 38);
      g.moveTo(64, 24);
      g.lineTo(120, 38);
      g.stroke();
    });

  CE.registerCine3D('convocation_call', {
    phases: [180, 210, 160, 150, 190],
    music: 'epic',
    title: '📣 A CONVOCAÇÃO',
    tags: ['PLANO 1 • A SEDE DA SELEÇÃO', 'PLANO 2 • OS 26 NOMES', 'PLANO 3 • CAMISA 11', 'PLANO 4 • A CAMISA', 'PLANO 5 • CONVOCADO'],
    get subs() {
      const n = CE.cinePlayerName();
      return [
        [{ from: 10, who: 'JINPACHI EGO', text: '"26 nomes. Nem um a mais."', color: '#00f5d4' }],
        [{ from: 4, who: 'JINPACHI EGO', text: '"Sae. Rin. Shidou. Bachira. Nagi..."', color: '#00f5d4' }],
        [{ from: 0, who: 'JINPACHI EGO', text: '"E o atacante titular..."', color: '#00f5d4' }],
        [{ from: 6, who: 'NARRADOR', text: 'A camisa 11 já tem dono.', color: '#94a3b8' }],
        [{ from: 10, who: 'NARRADOR', text: `${n}: convocado para a Copa.`, color: '#94a3b8' }]
      ];
    },
    theme: 'u20_national',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      const name = CE.cinePlayerName();
      if (phase === 0 || phase === 1 || phase === 2) {
        K.expo(0.85);
        // o telão: o Ego ao vivo (1), a lista (2), os óculos (3)
        let scrn;
        if (phase === 0) scrn = live('conv_ego', 512, 145, S, 2, (g, w, h) => CE.finEgoScreen(g, 0, 0, w, h, t, { size: 270, fy: 0.42, live: true, ticker: 'CONVOCAÇÃO OFICIAL • SELEÇÃO JAPONESA • COPA DO MUNDO • TÉCNICO: JINPACHI EGO' }));
        else if (phase === 1) scrn = live('conv_list', 600, 170, S, 1, (g, w, h) => convList(g, w, h, convPos(t)));
        else scrn = live('conv_glasses', 600, 170, S, 1, (g, w, h) => convGlasses(g, w, h, t));
        screenQuad(K, Object.assign({}, TEL, { cv: scrn.cv, dirty: scrn.dirty }));
        // a luz do telão no chão
        K.floor({ x0: 22.6, y0: 9.15, x1: 27.4, y1: 12.4, color: '#00f5d4', alpha: 0.07, em: true });
      }
      if (phase === 0) {
        // a imprensa e a comissão de costas, olhando o telão; as câmeras de TV dos lados
        const L = extras(11, 30);
        let i = 0;
        for (let row = 0; row < 2; row++) {
          for (let c = 0; c < 8; c++) {
            const x = 21.8 + c * 0.92 + (row % 2) * 0.45;
            const y = 11.7 + row * 0.85;
            if (x > 28.5) continue;
            K.actor(L[i % L.length], { id: 'imp' + i, x, y, face: [25, 9], frame: 0, k: 0.86 });
            i++;
          }
        }
        [[20.6, 12.4], [29.4, 12.4]].forEach(([x, y]) => {
          K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.6, color: '#0b1222' });
          K.box({ x0: x - 0.2, y0: y - 0.14, x1: x + 0.2, y1: y + 0.14, z0: 0.6, z1: 0.84, color: '#111827', top: '#1f2937' });
          K.box({ x0: x - 0.08, y0: y - 0.3, x1: x + 0.08, y1: y - 0.14, z0: 0.66, z1: 0.8, color: '#020617' });
          K.box({ x0: x - 0.05, y0: y - 0.05, x1: x + 0.05, y1: y + 0.05, z0: 0.86, z1: 0.9, color: '#ef4444', em: true });
        });
        // grua: do fundo do saguão, por cima da imprensa, até o telão
        const e = K.easeIO(k);
        const n = K.noise(S.f * 0.6, 3) * 0.01;
        K.cam(K.mix([25 + n, 1.6, 19.6], [25.2 + n, 1.15, 14.25], e), K.mix([25, 0.78, 9.2], [25, 0.92, 9.2], e), 50);
      } else if (phase === 1) {
        // a fila dos convocados na frente do telão; quem é chamado dá um passo e acende
        const pos = convPos(t);
        CONV_NAMES.slice(0, 6).forEach(([, , id], i) => {
          const on = Math.abs(pos - i) < 0.5;
          const step = on ? K.ease(seg(t - i * 22, 0, 10)) * 0.32 : pos > i + 0.5 ? 0.32 : 0;
          K.actor(id, { x: ROW_X[i], y: ROW_Y + step, ang: Math.PI / 2, kit: 'japan', frame: 45, k: 0.9, light: on ? [1.35, 1.45, 1.5] : [0.5, 0.56, 0.68] });
        });
        // você no fim da fila: só a silhueta até a lista chegar no fim
        K.actor('you', { x: ROW_X[6], y: ROW_Y, ang: Math.PI / 2, kit: 'japan', frame: 45, k: 0.9, light: t > 170 ? [0.35, 0.32, 0.18] : [0.1, 0.12, 0.18] });
        K.floor({ x0: ROW_X[6] - 0.6, y0: ROW_Y - 0.9, x1: ROW_X[6] + 0.6, y1: ROW_Y + 0.4, img: glowCv('rgba(250,204,21,0.5)'), color: '#ffffff', em: true, alpha: 0.999 });
        const cx = t < 132 ? ROW_X[0] + Math.max(0, pos) * 1.0 : lerp(ROW_X[5], ROW_X[6], easeIO(seg(t, 132, 196)));
        const sh = K.noise(S.f * 0.8, 5) * 0.006;
        K.cam([cx - 0.3 + sh, 0.72, 12.75], [cx + 0.1, 0.7, ROW_Y - 0.5], 42);
      } else if (phase === 2) {
        // você e os outros de costas, no escuro; a câmera entra no telão até os óculos
        K.actor('you', { x: 24.2, y: 12.4, ang: -Math.PI / 2, kit: 'japan', frame: 45, k: 0.9, light: [0.3, 0.45, 0.5] });
        K.actor('rin', { x: 26.1, y: 12.2, ang: -Math.PI / 2, kit: 'japan', frame: 45, k: 0.9, light: [0.3, 0.45, 0.5] });
        K.actor('sae', { x: 27.0, y: 12.6, ang: -Math.PI / 2, kit: 'japan', frame: 45, k: 0.9, light: [0.3, 0.45, 0.5] });
        const e = K.easeIO(k);
        const n = K.noise(S.f * 1.3, 3) * 0.004;
        K.cam(K.mix([25 + n, 0.95, 13.4], [25 + n, 0.95, 10.9], e), [25, 0.95, TEL.y], lerp(46, 40, e));
      } else if (phase === 3) {
        // o vestiário: a camisa 11 pendurada no armário, a câmera subindo até o nome
        K.expo(0.9);
        const jx = 39;
        const jy = 17.66;
        K.quad({ x: jx, y: jy - 0.01, z: 0.12, w: 1.6, h: 1.5, ang: Math.PI / 2, color: '#0b1630' });
        pic(K, { x: jx, y: jy, z: 1.18, w: 0.9, h: 0.14, ang: Math.PI / 2, img: plateCv(name), color: '#ffffff', light: [1.1, 1.1, 1.15] });
        pic(K, { x: jx, y: jy + 0.01, z: 0.96, w: 0.66, h: 0.2, ang: Math.PI / 2, img: hangerCv(), color: '#ffffff', light: [1, 1, 1.1] });
        pic(K, { x: jx, y: jy + 0.02, z: 0.28, w: 0.62, h: 0.71, ang: Math.PI / 2, img: jerseyCv(name), color: '#ffffff', light: [1.15, 1.2, 1.3] });
        // o feixe de luz de cima
        K.quad({ x: jx, y: jy + 0.25, z: 0.0, w: 1.4, h: 1.7, ang: Math.PI / 2, img: beamCv('219,234,254'), em: true, color: '#ffffff', alpha: 0.35 });
        const e = K.easeIO(k);
        K.cam([jx + 0.05, lerp(0.42, 0.96, e), jy + lerp(1.35, 1.55, e)], [jx, lerp(0.42, 0.98, e), jy], 36);
      } else {
        // o túnel: você de costas com a 11, a luz do campo estourada lá no fim
        K.expo(0.95);
        K.quad({ x: 43.96, y: 14.5, z: 0, w: 1.1, h: 1.5, ang: Math.PI, color: '#e0f2fe', em: true });
        K.floor({ x0: 41.5, y0: 13.6, x1: 43.95, y1: 15.4, color: '#bae6fd', alpha: 0.18, em: true });
        K.actor('you', { x: 42.1, y: 14.5, ang: 0, kit: 'japan', extra: { number: 11 }, frame: 45, k: 0.92, light: [0.42, 0.52, 0.72] });
        const e = K.easeIO(k);
        const n = K.noise(S.f * 0.7, 2) * 0.008;
        K.cam([lerp(39.6, 40.3, e), 0.66 + n, 14.5 + n], [44, lerp(0.64, 0.6, e), 14.5], 46);
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      const name = this.cinePlayerName();
      if (phase === 0) {
        this.cineDust(ctx, W, H, t, 30, 'rgba(153,246,228,0.55)', 5);
        this.finKicker(ctx, 40, top + 32, 'SEDE DA JFU • TÓQUIO • 23:00', seg(t, 6, 50));
      } else if (phase === 1) {
        // a cartela de quem está sendo chamado
        const c = t < 132 ? Math.min(5, Math.floor(t / 22)) : -1;
        const local = t < 132 ? t - c * 22 : t - 132;
        const a = ease(seg(local, 0, 9));
        ctx.save();
        ctx.translate((1 - a) * -200, 0);
        ctx.globalAlpha = a;
        const color = c >= 0 ? this.cineChar(CONV_NAMES[c][2]).auraColor || '#38bdf8' : '#facc15';
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        ctx.fillRect(36, bot - 104, 470, 66);
        ctx.fillStyle = color;
        ctx.fillRect(36, bot - 104, 470, 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(c >= 0 ? String(c + 1).padStart(2, '0') : '11', 56, bot - 70);
        ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(c >= 0 ? CONV_NAMES[c][0] : 'CAMISA 11 • ???', 96, bot - 70);
        ctx.restore();
        if (c < 0) {
          // o "?" em cima da silhueta
          const p = scr(K, ROW_X[6], 1.08, ROW_Y);
          if (p) this.cineImpactText(ctx, '?', p.x, p.y, 110, '#facc15', ease(seg(t, 150, 162)));
        }
      } else if (phase === 2) {
        if (t > 92) this.cineImpactText(ctx, 'CAMISA 11', W / 2, bot - 72, 76, '#facc15', seg(t, 92, 106), W * 0.8);
      } else if (phase === 3) {
        this.cineDust(ctx, W, H, t, 36, 'rgba(219,234,254,0.6)', 8);
      } else {
        // o nome nas costas (acima do 11) e a cartela
        const p = scr(K, 42.1, 0.7, 14.5);
        if (p) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          this.finPixelText(ctx, name, p.x, p.y, 2, '#e2e8f0', 'center', 160);
          ctx.restore();
        }
        this.cineDust(ctx, W, H, t, 26, 'rgba(224,242,254,0.6)', 2);
        this.cineTitleCard(ctx, W, top + 78, seg(t, 50, 84), { kicker: 'SELEÇÃO JAPONESA • COPA DO MUNDO', title: name, sub: 'Camisa 11 • atacante titular', color: '#38bdf8' });
        if (t >= 50) this.cineFlash(ctx, W, H, (1 - seg(t, 50, 64)) * 0.5);
        this.cineSfx(S, 50, 'convocado', () => window.SFX?.whoosh?.());
      }
    }
  });

  // ==========================================================================
  // 2. A VÉSPERA — o hotel da seleção (montado na área vazia): o prédio → a varanda →
  // a porta → o Shidou → os quatro
  // ==========================================================================
  // Quarto: x 84–89, y 15–19,6 (porta do corredor na parede norte; varanda a leste)
  // Corredor do hotel: x 84,7–86,3, y 6–15 (corre para o norte a partir da porta)
  const HR = { x0: 84, x1: 89, y0: 15, y1: 19.6, door: [85.5, 15], wall: 1.75 };
  const HALL = { x0: 84.7, x1: 86.3, y0: 6, y1: 15 };
  const carpetCv = () =>
    canvas('carpet', 64, 256, (g, w, h) => {
      g.fillStyle = '#4a0f1f';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(251,191,36,0.28)';
      [8, 22, 42, 56].forEach((x) => g.fillRect(x, 0, 2, h));
      for (let y = 0; y < h; y += 16) {
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(0, y, w, 1);
      }
    });
  const hallWallCv = () =>
    canvas('hallwall', 256, 64, (g, w, h) => {
      g.fillStyle = '#2a1730';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3b1f2c';
      g.fillRect(0, h * 0.62, w, h * 0.38);
      g.fillStyle = 'rgba(251,191,36,0.35)';
      g.fillRect(0, h * 0.6, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = 0; x < w; x += 32) g.fillRect(x, h * 0.62, 1, h * 0.38);
    });
  const doorCv = (num) =>
    canvas('hdoor|' + num, 48, 96, (g, w, h) => {
      g.fillStyle = '#3b1f2c';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1c0d14';
      g.lineWidth = 3;
      g.strokeRect(5, 6, w - 10, h * 0.4);
      g.strokeRect(5, h * 0.5, w - 10, h * 0.44);
      g.fillStyle = '#fbbf24';
      g.fillRect(w - 12, h * 0.5, 5, 5);
      g.font = '900 11px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(253,230,138,0.8)';
      g.fillText(num, w / 2, 16);
    });
  const roomWallCv = () =>
    canvas('roomwall', 128, 64, (g, w, h) => {
      g.fillStyle = '#0d1428';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(148,163,184,0.05)';
      for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 5, h);
    });
  const railCv = () =>
    canvas('rail', 128, 32, (g, w, h) => {
      g.fillStyle = '#1e293b';
      g.fillRect(0, 0, w, 4);
      g.fillRect(0, h - 3, w, 3);
      for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(148,163,184,0.6)';
      g.fillRect(0, 0, w, 1);
    });
  const curtainCv = () =>
    canvas('curtain', 32, 128, (g, w, h) => {
      g.fillStyle = 'rgba(148,163,184,0.22)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(191,219,254,0.12)';
      for (let x = 2; x < w; x += 7) g.fillRect(x, 0, 2, h);
    });
  const facadeCv = () =>
    canvas('facade', 256, 448, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#13234a');
      gr.addColorStop(0.7, '#0c1834');
      gr.addColorStop(1, '#070e22');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 20; r++) {
        for (let c = 0; c < 8; c++) {
          if (r === 3 && (c === 5 || c === 6)) continue;
          const q = rnd(r * 8 + c, 9);
          g.fillStyle = q < 0.1 ? 'rgba(253,224,71,0.85)' : q < 0.16 ? 'rgba(147,197,253,0.6)' : '#071026';
          g.fillRect(10 + c * 30, 12 + r * 21.6, 18, 13);
        }
      }
      g.fillStyle = '#0a1430';
      g.fillRect(0, 0, w, 6);
    });
  const hotelSignCv = () =>
    canvas('hotelsign', 256, 40, (g, w, h) => {
      g.font = '900 26px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#e2e8f0';
      g.fillText('HOTEL • JFA', w / 2, h / 2);
    });
  // o quarto do hotel (paredes, teto, cama, porta de vidro da varanda, a varanda)
  function hotelRoom(K, o = {}) {
    const { x0, x1, y0, y1, wall } = HR;
    K.ambient(o.amb || '#3a4a78');
    K.floor({ x0, y0, x1, y1, color: '#0b1324' });
    K.floor({ x0, y0, x1, y1, z: wall, color: '#070b16' });
    // parede norte com o vão da porta (x 85,05–85,95)
    K.quad({ x: (x0 + 85.05) / 2, y: y0, z: 0, w: 85.05 - x0, h: wall, ang: Math.PI / 2, img: roomWallCv(), color: '#ffffff' });
    K.quad({ x: (85.95 + x1) / 2, y: y0, z: 0, w: x1 - 85.95, h: wall, ang: Math.PI / 2, img: roomWallCv(), color: '#ffffff' });
    K.quad({ x: 85.5, y: y0, z: 1.35, w: 0.9, h: wall - 1.35, ang: Math.PI / 2, img: roomWallCv(), color: '#ffffff' });
    // batentes da porta
    K.box({ x0: 84.98, y0: y0 - 0.04, x1: 85.05, y1: y0 + 0.04, z0: 0, z1: 1.38, color: '#0b1222' });
    K.box({ x0: 85.95, y0: y0 - 0.04, x1: 86.02, y1: y0 + 0.04, z0: 0, z1: 1.38, color: '#0b1222' });
    K.box({ x0: 84.98, y0: y0 - 0.04, x1: 86.02, y1: y0 + 0.04, z0: 1.33, z1: 1.38, color: '#0b1222' });
    // parede oeste e sul
    K.quad({ x: x0, y: (y0 + y1) / 2, z: 0, w: y1 - y0, h: wall, ang: 0, img: roomWallCv(), color: '#ffffff' });
    K.quad({ x: (x0 + x1) / 2, y: y1, z: 0, w: x1 - x0, h: wall, ang: -Math.PI / 2, img: roomWallCv(), color: '#ffffff' });
    // a porta de vidro (leste): batentes e vidro com reflexo
    [15.0, 16.3, 17.3, 18.4, 19.6].forEach((y, i) => K.box({ x0: x1 - 0.05, y0: y - 0.05, x1: x1 + 0.05, y1: y + 0.05, z0: 0, z1: wall, color: '#0b1222' }));
    K.box({ x0: x1 - 0.05, y0: 16.3, x1: x1 + 0.05, y1: 18.4, z0: 1.46, z1: wall, color: '#0b1222' });
    K.box({ x0: x1 - 0.05, y0: 15.0, x1: x1 + 0.05, y1: 16.3, z0: 0, z1: wall, color: '#0d1428' });
    K.box({ x0: x1 - 0.05, y0: 18.4, x1: x1 + 0.05, y1: 19.6, z0: 0, z1: wall, color: '#0d1428' });
    K.quad({ x: x1, y: 17.35, z: 0, w: 2.1, h: 1.46, ang: Math.PI, color: '#93c5fd', alpha: 0.06, em: true });
    // a cama (perto da parede sul) e o criado-mudo com o abajur
    K.box({ x0: 85.4, y0: 17.5, x1: 87.3, y1: 19.55, z0: 0, z1: 0.24, color: '#0a1226', top: '#16213e' });
    K.box({ x0: 85.45, y0: 17.55, x1: 87.25, y1: 19.5, z0: 0.24, z1: 0.32, color: '#cbd5e1', top: '#1e3a8a' });
    K.box({ x0: 85.4, y0: 19.45, x1: 87.3, y1: 19.58, z0: 0, z1: 0.62, color: '#1e293b' });
    K.box({ x0: 84.3, y0: 18.9, x1: 84.95, y1: 19.5, z0: 0, z1: 0.4, color: '#1c1917', top: '#292524' });
    if (o.lamp) K.box({ x0: 84.55, y0: 19.1, x1: 84.7, y1: 19.25, z0: 0.4, z1: 0.62, color: '#fde68a', em: true });
    // a varanda e o parapeito
    K.floor({ x0: x1, y0: 15.6, x1: x1 + 1.3, y1: 19.0, z: 0.01, color: '#0c1529' });
    K.quad({ x: x1 + 1.25, y: 17.3, z: 0, w: 3.4, h: 0.46, ang: Math.PI, img: railCv(), color: '#ffffff' });
    // a cidade lá fora (fundo pintado longe) e a lua
    K.quad({ x: 112, y: 17, z: -2, w: 60, h: 18, ang: Math.PI, img: cityCv('leste', { seed: 4 }), color: '#ffffff', em: true, alpha: 0.999 });
    K.floor({ x0: x1 + 1.3, y0: -10, x1: 115, y1: 44, z: -2.1, color: '#04070f' });
    K.sprite(moonCv(), { x: 108, y: 12, z: 9, w: 3.2, h: 3.2, glow: true });
  }
  // o corredor do hotel (corre para o norte a partir da porta do quarto)
  function hotelHall(K, o = {}) {
    const { x0, x1, y0, y1 } = HALL;
    const wall = 1.75;
    K.ambient(o.amb || '#c08a4a');
    K.floor({ x0, y0, x1, y1, img: carpetCv(), color: '#ffffff' });
    K.floor({ x0, y0, x1, y1, z: wall, color: '#170c1d' });
    K.quad({ x: x0, y: (y0 + y1) / 2, z: 0, w: y1 - y0, h: wall, ang: 0, img: hallWallCv(), color: '#ffffff' });
    K.quad({ x: x1, y: (y0 + y1) / 2, z: 0, w: y1 - y0, h: wall, ang: Math.PI, img: hallWallCv(), color: '#ffffff' });
    // a janela acesa no fim do corredor
    K.quad({ x: (x0 + x1) / 2, y: y0, z: 0, w: x1 - x0, h: wall, ang: Math.PI / 2, color: '#2a1730' });
    K.quad({ x: (x0 + x1) / 2, y: y0 + 0.01, z: 0.4, w: 0.8, h: 0.9, ang: Math.PI / 2, color: '#fde68a', em: true });
    // portas dos quartos e as luminárias
    for (let i = 0; i < 5; i++) {
      const y = 7.2 + i * 1.6;
      pic(K, { x: x0 + 0.01, y, z: 0, w: 0.62, h: 1.25, ang: 0, img: doorCv(`11${2 * i + 1}`.padEnd(4, '0')), color: '#ffffff' });
      pic(K, { x: x1 - 0.01, y: y + 0.5, z: 0, w: 0.62, h: 1.25, ang: Math.PI, img: doorCv(`11${2 * i + 2}`.padEnd(4, '0')), color: '#ffffff' });
      K.box({ x0: 85.35, y0: y - 0.12, x1: 85.65, y1: y + 0.12, z0: wall - 0.04, z1: wall, color: '#fff7ed', em: true });
      K.sprite(glowCv('rgba(253,186,116,0.55)'), { x: 85.5, y, z: 1.2, w: 0.9, h: 0.9, glow: true, alpha: 0.6 });
    }
    // a luz do corredor entrando no quarto pelo vão da porta
    if (o.wedge) K.floor({ x0: 85.0, y0: 15.0, x1: 86.0, y1: 16.9, z: 0.012, img: canvas('wedge', 32, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(251,191,36,0.6)');
      gr.addColorStop(1, 'rgba(251,191,36,0)');
      g.fillStyle = gr;
      poly(g, [[4, 0], [28, 0], [w, h], [0, h]]);
      g.fill();
    }), color: '#ffffff', em: true, alpha: 0.999 });
  }
  CE.c3fHotelHall = hotelHall;
  CE.c3fHotelRoom = hotelRoom;
  const casual = (c) => ({ outfit: 'casual', clothesColor: c });

  CE.registerCine3D('camp_night', {
    phases: [190, 200, 180, 160, 190],
    music: 'mystery',
    title: '🌃 A VÉSPERA',
    tags: ['PLANO 1 • O HOTEL DA SELEÇÃO', 'PLANO 2 • A VARANDA', 'PLANO 3 • A PORTA', 'PLANO 4 • O BARULHO', 'PLANO 5 • QUATRO EGOS'],
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'O hotel inteiro dorme... quase.', color: '#94a3b8' }],
      [{ from: 20, who: 'RIN ITOSHI', text: '"...Também não consegue dormir?"', color: '#2dd4bf' }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Barulho na varanda às três?"', color: '#f472b6' }],
      [{ from: 6, who: 'RYUSEI SHIDOU', text: '"Parece velório aqui!"', color: '#f472b6' }],
      [{ from: 12, who: 'NARRADOR', text: 'Quatro egos. Amanhã, um gol só.', color: '#94a3b8' }]
    ],
    theme: 'u20_national',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      K.sky('#020617', '#16336e', 0.6);
      K.fog('#050b1c', 0.018);
      const RIN = casual('#1f2a44');
      const SAE = casual('#e5e7eb');
      const SHI = casual('#be185d');
      if (phase === 0) {
        // o prédio do hotel visto da avenida: a grua sobe até a única varanda acesa
        K.ambient('#5b6b9a');
        K.expo(1.0);
        const tx0 = 82;
        const tx1 = 88;
        const ty = 18;
        const top = 12.5;
        K.box({ x0: tx0, y0: 13, x1: tx1, y1: ty, z0: 0, z1: top, color: '#0c1834', top: '#0a1430' });
        pic(K, { x: (tx0 + tx1) / 2, y: ty + 0.01, z: 0, w: tx1 - tx0, h: top, ang: Math.PI / 2, img: facadeCv(), color: '#ffffff', em: true });
        pic(K, { x: (tx0 + tx1) / 2, y: ty + 0.02, z: top + 0.1, w: 3.2, h: 0.5, ang: Math.PI / 2, img: hotelSignCv(), color: '#ffffff', em: true });
        // a luz vermelha do topo (acende e apaga devagar)
        const red = 0.4 + 0.4 * Math.sin(t * 0.06);
        K.sprite(glowCv('rgba(239,68,68,0.95)'), { x: 82.6, y: 15.5, z: top + 0.3, w: 0.8, h: 0.8, glow: true, alpha: red });
        // a varanda acesa (linha 4, colunas 6–7) com o Rin em silhueta
        const bz = top - (3.5 / 20) * top - 0.45;
        const bx = tx0 + (6.1 / 8) * (tx1 - tx0);
        K.quad({ x: bx, y: ty + 0.015, z: bz, w: 1.2, h: 0.62, ang: Math.PI / 2, color: '#a5d7fc', em: true });
        K.box({ x0: bx - 0.75, y0: ty, x1: bx + 0.75, y1: ty + 0.45, z0: bz - 0.06, z1: bz, color: '#0b1328' });
        K.quad({ x: bx, y: ty + 0.44, z: bz, w: 1.5, h: 0.24, ang: Math.PI / 2, img: railCv(), color: '#ffffff' });
        K.actor('rin', { x: bx + 0.2, y: ty + 0.22, z: bz, ang: Math.PI / 2, extra: RIN, frame: 45, k: 0.9, dark: true });
        // a cidade atrás, a avenida e os faróis passando
        K.quad({ x: 85, y: -6, z: -1, w: 70, h: 16, ang: Math.PI / 2, img: cityCv('norte', { seed: 3 }), color: '#ffffff', em: true, alpha: 0.999 });
        K.floor({ x0: 55, y0: -8, x1: 115, y1: 40, z: -0.01, color: '#04070f' });
        K.floor({ x0: 60, y0: 19.2, x1: 110, y1: 22.6, z: 0.005, color: '#0b1222' });
        for (let x = 60; x < 110; x += 1.4) K.floor({ x0: x, y0: 20.85, x1: x + 0.7, y1: 20.95, z: 0.01, color: '#94a3b8', alpha: 0.5 });
        for (let i = 0; i < 6; i++) {
          const dir = i % 2 ? 1 : -1;
          const span = 50;
          const x = 60 + ((((rnd(i, 4) * span + t * (0.06 + i * 0.012) * dir) % span) + span) % span);
          const y = dir > 0 ? 20.3 : 21.6;
          K.box({ x0: x - 0.35, y0: y - 0.15, x1: x + 0.35, y1: y + 0.15, z0: 0.05, z1: 0.3, color: '#0f172a' });
          K.box({ x0: x + dir * 0.35 - 0.02, y0: y - 0.12, x1: x + dir * 0.35 + 0.02, y1: y + 0.12, z0: 0.1, z1: 0.16, color: dir > 0 ? '#fef08a' : '#fca5a5', em: true });
        }
        K.sprite(moonCv(), { x: 98, y: -4, z: 14, w: 4, h: 4, glow: true });
        const e = K.easeIO(k);
        K.cam(K.mix([84.2, 0.6, 33], [bx - 0.3, bz + 0.55, ty + 4.2], e), K.mix([85, 6.0, ty], [bx, bz + 0.45, ty], e), lerp(50, 34, e));
      } else if (phase === 1) {
        // de dentro do quarto escuro: o Rin de costas na varanda, a cidade lá fora
        hotelRoom(K, { amb: '#45558a' });
        K.actor('rin', { x: 90.0, y: 17.4, ang: 0, extra: RIN, frame: 45, k: 0.9, light: [0.35, 0.45, 0.72] });
        // a cortina mexendo com o vento
        const sway = Math.sin(t * 0.04) * 0.12;
        K.quad({ x: 88.9, y: 18.0 + sway, z: 0, w: 0.7, h: 1.7, ang: Math.PI, img: curtainCv(), color: '#ffffff', alpha: 0.75, light: [0.6, 0.7, 0.9] });
        const e = K.easeIO(k);
        const n = K.noise(S.f * 0.5, 2) * 0.006;
        K.cam(K.mix([86.0, 0.85 + n, 17.1], [86.7, 0.82 + n, 17.2], e), [91, 0.66, 17.4], 46);
      } else if (phase === 2) {
        // o Sae parado na porta, a luz do corredor atrás dele
        hotelHall(K, { wedge: true, amb: '#d39a5a' });
        hotelRoom(K, { amb: '#22305a' });
        K.actor('sae', { x: 85.5, y: 14.75, ang: Math.PI / 2, extra: SAE, frame: 45, k: 0.9, light: [0.7, 0.55, 0.42] });
        const e = K.easeIO(k);
        K.cam(K.mix([86.3, 0.5, 18.4], [86.1, 0.52, 17.9], e), [85.5, 0.78, 14.6], 44);
      } else if (phase === 3) {
        // o Shidou escancara a porta gargalhando (contra-plongée, a câmera tremendo)
        hotelHall(K, { wedge: true, amb: '#e0a060' });
        hotelRoom(K, { amb: '#3a2a4a' });
        const sh = t < 60 ? 0.012 : 0.005;
        const nx = K.noise(S.f * 2.1, 3) * sh;
        const ny = K.noise(S.f * 1.9, 7) * sh;
        K.actor('shidou', { x: 85.5, y: 15.25, ang: Math.PI / 2, extra: SHI, frame: 45, k: 0.95, light: [1.2, 0.85, 1.05], opts: { showAura: true } });
        K.cam([85.6 + nx, 0.3 + ny, 16.75], [85.5, 0.82, 14.8], 50);
      } else {
        // o quarto inteiro: o Sae na porta, o Shidou atrás, o Rin na varanda, você na cama
        hotelHall(K, { wedge: true, amb: '#c08a4a' });
        hotelRoom(K, { amb: '#4a5a8e', lamp: true });
        K.actor('sae', { x: 85.5, y: 15.2, ang: -0.3, extra: SAE, frame: 45, k: 0.9, light: [0.75, 0.62, 0.5] });
        K.actor('shidou', { x: 85.55, y: 14.3, ang: Math.PI / 2, extra: SHI, frame: 45, k: 0.9, light: [0.85, 0.6, 0.7] });
        K.actor('rin', { x: 89.95, y: 16.3, ang: 0, extra: RIN, frame: 45, k: 0.9, light: [0.35, 0.45, 0.72] });
        K.actor('you', { x: 86.4, y: 17.75, ang: -Math.PI / 2 + 0.3, extra: casual('#1e3a8a'), frame: 45, k: 0.9, light: [0.4, 0.5, 0.75] });
        const e = K.easeIO(k);
        K.cam(K.mix([86.9, 0.95, 19.35], [87.2, 1.1, 19.45], e), K.mix([87.3, 0.6, 15.6], [87.6, 0.6, 15.8], e), lerp(48, 56, e));
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        this.cineBokeh(ctx, W, bot - 90, bot + 20, t, 10, ['rgba(253,224,71,0.35)', 'rgba(147,197,253,0.35)'], 3);
        this.finKicker(ctx, 40, top + 32, 'CONCENTRAÇÃO DA SELEÇÃO • 02:47', seg(t, 8, 60));
      } else if (phase === 2) {
        // painéis de mangá: o olho do Rin e os seus olhos
        const sB = ease(seg(t, 40, 56));
        const sC = ease(seg(t, 85, 101));
        if (sB > 0) {
          this.finPanel(ctx, [[716, top + 14], [1256, top + 14], [1256, 354], [690, 354]], () => {
            this.cineGradient(ctx, 680, top, 600, 280, [[0, '#071533'], [1, '#020617']]);
            const z = 1 + easeIO(seg(t, 40, 180)) * 0.08;
            const dw = 640 * z;
            this.finEyes(ctx, this.cineChar('rin'), 973 - dw / 2, 227 - (dw / 14) * 3.1, dw, { look: -2, half: true, ring: '#2dd4bf', iris: '#0f766e' });
            const lg = ctx.createLinearGradient(690, 0, 1256, 0);
            lg.addColorStop(0, 'rgba(2,6,23,0.75)');
            lg.addColorStop(0.45, 'rgba(2,6,23,0)');
            lg.addColorStop(1, 'rgba(147,197,253,0.16)');
            ctx.fillStyle = lg;
            ctx.fillRect(680, top, 600, 280);
          }, { dx: (1 - sB) * 600 });
        }
        if (sC > 0) {
          this.finPanel(ctx, [[680, 370], [1256, 370], [1256, bot - 14], [596, bot - 14]], () => {
            this.cineGradient(ctx, 590, 360, 680, 280, [[0, '#0a1024'], [1, '#03050c']]);
            const dw = 660;
            this.finEyes(ctx, this.cineYou(), 926 - dw / 2, 495 - (dw / 14) * 3.1, dw, { look: t < 140 ? -2 : 2 });
            const lg = ctx.createLinearGradient(0, 370, 0, bot);
            lg.addColorStop(0, 'rgba(2,6,23,0)');
            lg.addColorStop(1, 'rgba(2,6,23,0.6)');
            ctx.fillStyle = lg;
            ctx.fillRect(590, 360, 680, 280);
          }, { dy: (1 - sC) * 320 });
        }
      } else if (phase === 3) {
        this.drawRadialSpeedLines(ctx, 640, 360, W, '#f9a8d4', 0.14);
        const letters = ['H', 'A', 'H', 'A', 'H', 'A', '!'];
        letters.forEach((ch, i) => {
          const kk = seg(t, 8 + i * 5, 18 + i * 5);
          if (kk <= 0) return;
          const x = 250 + i * 130;
          const y = top + 92 + Math.abs(Math.sin(t * 0.18 + i * 1.1)) * -16 + (i % 2) * 26;
          this.cineImpactText(ctx, ch, x, y, 96, i % 2 ? '#f9a8d4' : '#fdf2f8', kk, 0, (i % 2 ? 1 : -1) * 0.14);
        });
        this.cineSfx(S, 8, 'haha', () => window.SFX?.whoosh?.());
      } else if (phase === 4) {
        this.cineImpactText(ctx, '4 EGOS.', W * 0.36, top + 58, 52, '#e2e8f0', seg(t, 60, 72));
        this.cineImpactText(ctx, '1 GOL.', W * 0.64, top + 58, 52, '#facc15', seg(t, 95, 107));
        this.finKicker(ctx, W - 40, bot - 30, 'AMANHÃ • JAPÃO x COREIA DO SUL', seg(t, 130, 175), '#facc15', 'right');
      }
    }
  });

  // ==========================================================================
  // 3. O ÚLTIMO DUELO — o campo do prédio, de noite e na chuva
  // ==========================================================================
  // telão em cima da arquibancada norte (atrás do gol)
  const BIG = { x: 53, y: 5.92, z: 1.95, w: 5.6, h: 2.1, ang: Math.PI / 2 };
  const bigPosts = (K) => {
    [BIG.x - BIG.w * 0.36, BIG.x + BIG.w * 0.36].forEach((x) => K.box({ x0: x - 0.06, y0: BIG.y - 0.12, x1: x + 0.06, y1: BIG.y, z0: 1.6, z1: BIG.z, color: '#050a16' }));
  };
  // a noite de chuva no campo
  const rainNight = (K) => {
    K.sky('#010309', '#0a1a3a', 0.15);
    K.fog('#050b18', 0.03);
    K.expo(0.92);
  };
  const duelBoard = (S) =>
    live('duel_board', 512, 192, S, 1000, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#062a3a'], [1, '#020b16']]);
      CE.finPixelText(g, 'BLUE LOCK', w / 2, h * 0.34, 4.2, '#00f5d4');
      CE.finPixelText(g, 'Nº 1 ?', w / 2, h * 0.7, 4, '#facc15');
      CE.finFillPat(g, 'dots', 0, 0, w, h, 0.8);
    });
  const duelEgo = (S, t) =>
    live('duel_ego', 512, 192, S, 2, (g, w, h) => CE.finEgoScreen(g, 0, 0, w, h, t, { size: 340, fy: 0.42, ticker: '3 GOLS • QUEM MARCAR PRIMEIRO É O Nº 1 DO BLUE LOCK • SEM SELEÇÃO • SEM CLUBE • SÓ EGO' }));
  const YOU_D = [53, 16.0];
  const RIN_D = [53, 13.0];

  CE.registerCine3D('rin_final_duel', {
    phases: [190, 190, 170, 220, 190],
    music: 'tension',
    title: '🌧️ O ÚLTIMO DUELO',
    tags: ['PLANO 1 • O ESTÁDIO VAZIO', 'PLANO 2 • FRENTE A FRENTE', 'PLANO 3 • O TELÃO', 'PLANO 4 • OS MONSTROS', 'PLANO 5 • O ÚLTIMO DUELO'],
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'Só a chuva... e dois atacantes.', color: '#94a3b8' }],
      [
        { from: 6, to: 100, who: 'RIN ITOSHI', text: '"Você veio."', color: '#2dd4bf' },
        { from: 100, who: 'VOCÊ', text: '"Claro."', color: '#00f5d4' }
      ],
      [{ from: 10, who: 'JINPACHI EGO', text: '"Sem torcida. Só ego."', color: '#00f5d4' }],
      [{ from: 6, who: 'NARRADOR', text: 'O monstro do Rin acorda... e o seu responde.', color: '#94a3b8' }],
      [{ from: 2, who: 'NARRADOR', text: 'Um é o nº 1. O outro, o 2 pra sempre.', color: '#94a3b8' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      rainNight(K);
      const rin = { kit: null, extra: Object.assign({ angry: true }, KIT_RIN) };
      // o telão em cima da arquibancada
      const scrn = phase === 2 ? duelEgo(S, t) : duelBoard(S);
      screenQuad(K, Object.assign({}, BIG, { cv: scrn.cv, dirty: scrn.dirty }));
      bigPosts(K);
      if (phase === 0) {
        // plano geral do alto: a grua desce até os dois no círculo central
        K.actor('you', { x: 52.55, y: 14.5, ang: 0, extra: KIT_BL, frame: 45, k: 0.9 });
        K.actor('rin', { x: 53.45, y: 14.5, ang: Math.PI, extra: rin.extra, frame: 45, k: 0.9 });
        const e = K.easeIO(k);
        K.cam(K.mix([53, 5.4, 24.5], [53, 1.0, 17.6], e), K.mix([53, 0.4, 12.2], [53, 0.55, 14.5], e), lerp(56, 44, e));
      } else if (phase === 1) {
        // por cima do seu ombro: o Rin parado na chuva, de contraluz
        K.actor('you', { x: YOU_D[0], y: YOU_D[1], ang: -Math.PI / 2, extra: KIT_BL, frame: 45, k: 0.9, light: [0.3, 0.38, 0.55] });
        K.actor('rin', { x: RIN_D[0], y: RIN_D[1], ang: Math.PI / 2, extra: rin.extra, frame: 45, k: 0.9, light: [0.55, 0.85, 0.9] });
        const e = K.easeIO(k);
        const n = K.noise(S.f * 0.9, 4) * 0.01;
        K.cam(K.mix([53.42 + n, 0.82, 16.85], [53.32 + n, 0.8, 16.7], e), K.mix([52.95, 0.62, 13.0], [53.05, 0.66, 13.0], e), lerp(40, 36, e));
      } else if (phase === 2) {
        // o telão com o Ego enorme; a câmera abre e mostra os dois pequenos lá embaixo
        K.actor('you', { x: 52.4, y: 9.4, ang: -Math.PI / 2, extra: KIT_BL, frame: 45, k: 0.9, light: [0.35, 0.7, 0.75] });
        K.actor('rin', { x: 53.6, y: 9.4, ang: -Math.PI / 2, extra: rin.extra, frame: 45, k: 0.9, light: [0.35, 0.7, 0.75] });
        K.floor({ x0: 50.2, y0: 6.7, x1: 55.8, y1: 10.5, color: '#00f5d4', alpha: 0.08, em: true });
        const e = K.easeIO(seg(t, 10, 160));
        K.cam(K.mix([53, 2.9, 8.8], [53, 0.75, 13.2], e), K.mix([53, 3.0, 5.9], [53, 1.9, 6.0], e), lerp(42, 50, e));
      } else if (phase === 3) {
        // o Rin de perto, o abismo atrás dele; depois os dois de lado (a tela racha)
        if (t < 80) {
          K.actor('rin', { x: 53, y: 14.5, ang: Math.PI / 2, extra: rin.extra, frame: 45, k: 0.9, light: [0.4, 0.95, 1.0] });
          const z = easeIO(t / 80);
          K.cam([53.05, 0.45, 16.7 - z * 0.2], [53, 0.62, 14.5], 34);
        } else {
          K.actor('rin', { x: 52.3, y: 14.5, ang: 0, extra: rin.extra, frame: 45, k: 0.9, light: [0.4, 0.9, 0.95] });
          K.actor('you', { x: 53.7, y: 14.5, ang: Math.PI, extra: KIT_BL, frame: 45, k: 0.9, light: [1.1, 0.55, 0.5] });
          const z = easeIO(seg(t, 80, 220));
          K.cam([53, 0.5, 17.0 - z * 0.25], [53, 0.6, 14.5], 40);
        }
      } else {
        // os dois no meio do campo, as auras se chocando na linha do meio
        K.actor('rin', { x: 52.2, y: 14.5, ang: 0, extra: rin.extra, frame: 45, k: 0.9, light: [0.4, 0.85, 0.95] });
        K.actor('you', { x: 53.8, y: 14.5, ang: Math.PI, extra: KIT_BL, frame: 45, k: 0.9, light: [1.05, 0.55, 0.5] });
        K.floor({ x0: 52.9, y0: 13.5, x1: 53.1, y1: 15.5, color: '#ffffff', alpha: 0.35, em: true });
        const z = easeIO(t / 190);
        K.cam([53, 0.62, 17.6 - z * 0.3], [53, 0.66, 14.5], 46);
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      const rin = this.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
      const you = this.cineYou(KIT_BL);
      if (phase === 0) {
        this.finSplashes(ctx, 0, W, H * 0.55, bot, t, 34);
        rain(ctx, S);
        this.finKicker(ctx, 40, top + 30, 'UMA SEMANA DEPOIS DA COPA', seg(t, 8, 46));
        this.finKicker(ctx, 40, top + 58, 'ESTÁDIO DO BLUE LOCK • 23:41', seg(t, 36, 80), '#38bdf8');
      } else if (phase === 1) {
        this.finSplashes(ctx, 200, 1080, H * 0.66, bot, t, 18);
        rain(ctx, S, 1.1);
        // faixas com os olhos (mangá): o Rin em cima, você embaixo
        const e1 = ease(seg(t, 92, 108));
        if (e1 > 0) {
          this.finPanel(ctx, [[0, top + 18], [W, top + 18], [W, top + 128], [0, top + 128]], () => {
            ctx.fillStyle = '#010409';
            ctx.fillRect(0, top, W, 150);
            const dw = 520;
            this.finEyes(ctx, rin, 640 - dw / 2, top + 73 - (dw / 14) * 3.1, dw, { angry: true, ring: '#22d3ee', iris: '#0f766e', tiny: t > 130 });
            ctx.fillStyle = 'rgba(2,24,30,0.3)';
            ctx.fillRect(0, top, W, 150);
          }, { dx: (1 - e1) * -W });
        }
        const e2 = ease(seg(t, 140, 156));
        if (e2 > 0) {
          this.finPanel(ctx, [[0, bot - 128], [W, bot - 128], [W, bot - 18], [0, bot - 18]], () => {
            ctx.fillStyle = '#0a0204';
            ctx.fillRect(0, bot - 140, W, 150);
            const dw = 520;
            this.finEyes(ctx, you, 640 - dw / 2, bot - 73 - (dw / 14) * 3.1, dw, {});
          }, { dx: (1 - e2) * W });
        }
      } else if (phase === 2) {
        this.finSplashes(ctx, 0, W, H * 0.6, bot, t, 20, '153,246,228');
        rain(ctx, S, 1.2);
      } else if (phase === 3) {
        const shake = this.cineNoise(S.f * 2, 7) * (t > 80 && t < 118 ? 5 : 1.2);
        if (t < 80) {
          // o abismo do Rin subindo atrás dele (só o brilho, sem cobrir o boneco)
          const p = scr(K, 53, 0.55, 14.6);
          if (p) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.12;
            this.drawRinAbyss(ctx, p.x + shake, p.y - 230, 1.8, t, ease(t / 75));
            ctx.restore();
          }
          ctx.fillStyle = 'rgba(0,30,36,0.18)';
          ctx.fillRect(0, top, W, bot - top);
          rain(ctx, S, 0.8);
        } else {
          // a tela racha na diagonal: o lado do Rin (verde-água) e o seu (vermelho)
          const ks = ease(seg(t, 80, 100));
          const seamT = lerp(W + 300, 700, ks);
          const seamB = seamT - 220;
          const pr = scr(K, 52.3, 0.55, 14.5);
          const py = scr(K, 53.7, 0.55, 14.5);
          ctx.save();
          poly(ctx, [[0, 0], [seamT, 0], [seamB, H], [0, H]]);
          ctx.clip();
          ctx.fillStyle = 'rgba(0,40,46,0.3)';
          ctx.fillRect(0, 0, W, H);
          if (pr) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.28;
            this.drawRinAbyss(ctx, pr.x + shake, pr.y - 40, 1.0, t, 1);
          }
          ctx.restore();
          if (ks > 0) {
            ctx.save();
            poly(ctx, [[seamT, 0], [W, 0], [W, H], [seamB, H]]);
            ctx.clip();
            ctx.fillStyle = 'rgba(60,0,6,0.34)';
            ctx.fillRect(0, 0, W, H);
            if (py) {
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 0.3;
              this.finYouMonster(ctx, py.x - shake, py.y - 170, 200, t, ease(seg(t, 84, 140)));
            }
            ctx.restore();
            const pts = [];
            for (let i = 0; i <= 12; i++) {
              const f = i / 12;
              const j = i % 2 ? 14 : -14;
              pts.push([lerp(seamT, seamB, f) + (i && i < 12 ? j : 0), lerp(-20, H + 20, f)]);
            }
            ctx.save();
            ctx.lineJoin = 'miter';
            [['#020617', 12], ['#f8fafc', 5]].forEach(([c, w]) => {
              ctx.strokeStyle = c;
              ctx.lineWidth = w;
              ctx.beginPath();
              pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
              ctx.stroke();
            });
            ctx.restore();
          }
          rain(ctx, S, 0.8);
          if (t >= 80) this.cineFlash(ctx, W, H, (1 - seg(t, 80, 92)) * 0.45);
          this.cineSfx(S, 80, 'racha', () => window.SFX?.kick?.(1));
        }
      } else {
        // o choque das auras na linha do meio
        const pm = scr(K, 53, 0.5, 14.5);
        const pr = scr(K, 52.2, 0.5, 14.5);
        const py = scr(K, 53.8, 0.5, 14.5);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (pr) {
          ctx.globalAlpha = 0.26;
          this.drawRinAbyss(ctx, pr.x - 40, pr.y - 40, 0.6, t, 1);
        }
        if (py) {
          ctx.globalAlpha = 0.28;
          this.finYouMonster(ctx, py.x + 40, py.y - 190, 160, t, 1);
        }
        ctx.restore();
        if (pm) {
          const cg = ctx.createLinearGradient(pm.x - 40, 0, pm.x + 40, 0);
          cg.addColorStop(0, 'rgba(34,211,238,0)');
          cg.addColorStop(0.35, 'rgba(34,211,238,0.5)');
          cg.addColorStop(0.5, 'rgba(255,255,255,0.85)');
          cg.addColorStop(0.65, 'rgba(239,68,68,0.5)');
          cg.addColorStop(1, 'rgba(239,68,68,0)');
          ctx.fillStyle = cg;
          ctx.fillRect(pm.x - 40, top, 80, bot - top);
          this.cineGlow(ctx, pm.x, pm.y - 60, 170, 'rgba(255,255,255,0.4)');
          for (let i = 0; i < 26; i++) {
            const ph = (t * 0.03 + rnd(i, 40)) % 1;
            const a = (rnd(i, 41) - 0.5) * 2.4 + (i % 2 ? 0 : Math.PI);
            const d = ph * 240;
            ctx.fillStyle = i % 2 ? `rgba(165,243,252,${1 - ph})` : `rgba(254,202,202,${1 - ph})`;
            ctx.fillRect(pm.x + Math.cos(a) * d, pm.y - 160 + rnd(i, 42) * 200 + Math.sin(a) * d * 0.5, 4, 4);
          }
        }
        this.finSplashes(ctx, 200, 1080, H * 0.66, bot, t, 24);
        rain(ctx, S);
        this.cineTitleCard(ctx, W, top + 92, seg(t, 30, 62), { kicker: 'BLUE LOCK • A DISPUTA PELO Nº 1', title: 'O ÚLTIMO DUELO', sub: '', color: '#22d3ee' });
        const kp = ease(seg(t, 70, 90));
        if (kp > 0) {
          ctx.save();
          ctx.globalAlpha = kp;
          [[pr ? pr.x : 450, 'RIN ITOSHI', '#22d3ee'], [py ? py.x : 830, this.cinePlayerName(), '#f87171']].forEach(([x, nm, c]) => {
            ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
            const w = Math.min(320, ctx.measureText(nm).width + 34);
            ctx.fillStyle = 'rgba(2,6,23,0.88)';
            ctx.fillRect(x - w / 2, bot - 52, w, 36);
            ctx.fillStyle = c;
            ctx.fillRect(x - w / 2, bot - 52, w, 3);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(nm, x, bot - 33, w - 16);
          });
          ctx.restore();
        }
        if (t >= 30) this.cineFlash(ctx, W, H, (1 - seg(t, 30, 44)) * 0.55);
        this.cineSfx(S, 30, 'titulo', () => window.SFX?.whistle?.(1));
      }
    }
  });

  // ==========================================================================
  // 4. DEPOIS DO DUELO — deitados na grama → o céu → o rosto do Rin → o placar → o Nº 1
  // ==========================================================================
  // os dois deitados, cabeça com cabeça no círculo central (desenhados uma vez, deitados)
  const lying = (who, ch, headRight, face) =>
    pose(`lie|${who}|${headRight ? 1 : 0}|${face || ''}|${CE.cinePlayerName()}`, (g, x, feet, size) => {
      g.save();
      g.translate(x, feet - 70);
      if (headRight) g.scale(-1, 1);
      CE.bdorLying(g, ch, 0.43 * size, 0, size, {});
      if (face) {
        // pálpebras e o canto da boca (em unidades do boneco, já deitado)
        const u = size / 36;
        g.translate(0.43 * size, -6.5 * u);
        g.rotate(-Math.PI / 2);
        const top = -size * 0.87;
        const skin = '#f8dcc4';
        const shd = CE.finShade(skin, -0.24);
        if (face === 'closed') {
          CE.finU(g, 0, top, u, 12.8, 8.6, 3.5, 2.8, skin);
          CE.finU(g, 0, top, u, 19.7, 8.6, 3.5, 2.8, skin);
          CE.finU(g, 0, top, u, 12.9, 10.2, 3.3, 0.45, '#0a0f1c');
          CE.finU(g, 0, top, u, 19.8, 10.2, 3.3, 0.45, '#0a0f1c');
        } else {
          CE.finU(g, 0, top, u, 12.9, 8.95, 3.2, 0.8, shd);
          CE.finU(g, 0, top, u, 19.9, 8.95, 3.2, 0.8, shd);
          CE.finU(g, 0, top, u, 12.8, 9.7, 3.4, 0.4, '#0a0f1c');
          CE.finU(g, 0, top, u, 19.8, 9.7, 3.4, 0.4, '#0a0f1c');
          CE.finU(g, 0, top, u, 16.6, 11.8, 2.8, 1.2, skin);
          CE.finU(g, 0, top, u, 16.8, 12.15, 1.9, 0.38, '#7c2d12');
          if (face === 'smile') CE.finU(g, 0, top, u, 18.6, 11.75, 0.6, 0.38, '#7c2d12');
        }
      }
      g.restore();
    });
  const ringCv = () =>
    canvas('ring', 64, 64, (g) => {
      g.strokeStyle = 'rgba(191,219,254,0.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(32, 32, 28, 0, TAU);
      g.stroke();
    });
  const cloudCv = () =>
    canvas('cloud', 256, 128, (g, w, h) => {
      g.fillStyle = 'rgba(11,19,36,0.94)';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(40 + i * 36, 64 + Math.sin(i * 2) * 14, 52, 30, 0, 0, TAU);
        g.fill();
      }
      g.strokeStyle = 'rgba(96,165,250,0.22)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(w / 2, 54, 110, 30, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    });
  const endBoard = (sh, sa) =>
    canvas(`endboard|${sh}|${sa}`, 512, 214, (g, w, h) => {
      g.fillStyle = '#04070f';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#020409';
      g.fillRect(10, 10, w - 20, h - 20);
      CE.finPixelText(g, 'BLUE LOCK • DUELO PELO Nº 1', w / 2, 40, 1.7, '#00f5d4');
      CE.finPixelText(g, 'VOCÊ', 100, 112, 2.6, '#f8fafc');
      CE.finPixelText(g, 'RIN', 412, 112, 2.6, '#2dd4bf');
      CE.finPixelText(g, `${sh}`, 192, 112, 6.6, '#facc15');
      CE.finPixelText(g, '-', 256, 112, 5, '#64748b');
      CE.finPixelText(g, `${sa}`, 320, 112, 6.6, '#facc15');
      CE.finPixelText(g, 'FIM DE JOGO', w / 2, 178, 2, '#f87171');
      CE.finFillPat(g, 'dots', 10, 10, w - 20, h - 20, 0.85);
    });
  function rankBoard(g, w, h, t, name) {
    CE.cineGradient(g, 0, 0, w, h, [[0, '#020a18'], [1, '#03122a']]);
    CE.finEgoScreen(g, 0, 0, 170, h, t, { size: 230, fx: 0.5, fy: 0.42 });
    CE.finPixelText(g, 'RANKING DO BLUE LOCK', 186, 26, 1.8, '#00f5d4', 'left');
    g.font = '900 11px "Segoe UI", sans-serif';
    g.fillStyle = '#38bdf8';
    g.textBaseline = 'middle';
    g.fillText('A T U A L I Z A Ç Ã O   F I N A L', 188, 48);
    const row = (y, kk, rank, color, hi) => {
      if (kk <= 0) return undefined;
      const x = 186 + (1 - ease(kk)) * 340;
      g.fillStyle = hi ? 'rgba(250,204,21,0.16)' : 'rgba(2,6,23,0.85)';
      g.fillRect(x, y - 26, 316, 52);
      g.fillStyle = color;
      g.fillRect(x, y - 26, 5, 52);
      CE.finPixelText(g, rank, x + 14, y, 2.8, color, 'left');
      return x;
    };
    const land = 92;
    const x2 = row(186, seg(t, 6, 22), 'Nº 2', '#2dd4bf', false);
    if (x2 !== undefined) CE.finPixelText(g, 'RIN ITOSHI', x2 + 108, 186, 2.2, '#e2e8f0', 'left', 200);
    const x1 = row(108, seg(t, 26, 42), 'Nº 1', '#facc15', t >= land);
    if (x1 !== undefined) {
      g.save();
      g.beginPath();
      g.rect(x1 + 100, 82, 214, 52);
      g.clip();
      if (t < land) {
        const pool = ['SHIDOU', 'BACHIRA', 'NAGI', 'KUNIGAMI', 'BAROU', 'CHIGIRI', 'REO', 'RIN ITOSHI'];
        const p = easeIO(seg(t, 34, land)) * 22;
        for (let i = Math.floor(p) - 1; i <= Math.floor(p) + 1; i++) {
          const y = 108 + (i - p) * 40;
          CE.finPixelText(g, i >= 22 ? name : pool[((i % pool.length) + pool.length) % pool.length], x1 + 108, y, 2.2, '#94a3b8', 'left', 200);
        }
      } else CE.finPixelText(g, name, x1 + 108, 108, 2.4, '#facc15', 'left', 200);
      g.restore();
    }
    CE.finFillPat(g, 'scan', 0, 0, w, h, 0.5);
  }
  // os dois deitados no círculo central (cabeça com cabeça)
  const lieBoth = (K, o = {}) => {
    const rinCh = CE.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
    const youCh = CE.cineYou(KIT_BL);
    poseFloor(K, lying('rin', rinCh, true, null), { x: 52.25, y: 14.35, light: o.light || [0.62, 0.7, 0.85] });
    poseFloor(K, lying('you', youCh, false, null), { x: 53.75, y: 14.65, light: o.light || [0.62, 0.7, 0.85] });
  };

  CE.registerCine3D('rin_final_end', {
    phases: [180, 170, 210, 160, 210],
    music: 'promise',
    title: '🌌 O NÚMERO 1',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • O CÉU', 'PLANO 3 • O RIN', 'PLANO 4 • O PLACAR', 'PLANO 5 • RANKING FINAL'],
    subs: [
      [{ from: 2, who: 'NARRADOR', text: 'Nenhum dos dois consegue levantar.', color: '#94a3b8' }],
      [{ from: 6, who: 'NARRADOR', text: 'A chuva para. Enfim, estrelas.', color: '#94a3b8' }],
      [
        { from: 2, to: 90, who: 'NARRADOR', text: 'Perdeu.', color: '#94a3b8' },
        { from: 90, who: 'NARRADOR', text: '...e quase sorri.', color: '#2dd4bf' }
      ],
      [{ from: 6, who: 'NARRADOR', text: 'Ninguém grita. Nem precisa.', color: '#94a3b8' }],
      [{ from: 86, who: 'JINPACHI EGO', text: '"...Perfeito."', color: '#00f5d4' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      const [sh, sa] = CE.finScore();
      K.sky('#01030a', '#0f2148', phase === 0 ? 0.2 : 1);
      K.fog('#050b18', 0.024);
      K.expo(0.95);
      const name = CE.cinePlayerName();
      const board = phase === 4 ? live('rank', 512, 214, S, 1, (g, w, h) => rankBoard(g, w, h, t, name)) : { cv: endBoard(sh, sa), dirty: false };
      screenQuad(K, Object.assign({}, BIG, { cv: board.cv, dirty: board.dirty }));
      bigPosts(K);
      // poças de chuva com anéis
      [[51.4, 13.4], [54.6, 15.8], [54.2, 13.0], [51.8, 16.1]].forEach(([x, y], j) => {
        K.floor({ x0: x - 0.45, y0: y - 0.2, x1: x + 0.45, y1: y + 0.2, z: 0.008, img: canvas('pocaazul', 64, 32, (g, w, h) => {
          g.fillStyle = 'rgba(30,58,95,0.75)';
          g.beginPath();
          g.ellipse(w / 2, h / 2, w * 0.47, h * 0.42, 0, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(191,219,254,0.18)';
          g.beginPath();
          g.ellipse(w * 0.42, h * 0.42, w * 0.22, h * 0.16, 0, 0, TAU);
          g.fill();
        }), color: '#ffffff', alpha: 0.999 });
        if (phase <= 2) {
          for (let i = 0; i < 2; i++) {
            const ph = (t * 0.02 + i * 0.5 + j * 0.3) % 1;
            const r = 0.06 + ph * 0.3;
            K.floor({ x0: x - r + (rnd(j * 3 + i, 60) - 0.5) * 0.4, y0: y - r * 0.6, x1: x + r + (rnd(j * 3 + i, 60) - 0.5) * 0.4, y1: y + r * 0.6, z: 0.012, img: ringCv(), color: '#ffffff', alpha: (1 - ph) * 0.6, em: true });
          }
        }
      });
      if (phase === 0) {
        // de cima: os dois deitados, a câmera subindo e girando
        lieBoth(K);
        const e = K.easeIO(k);
        const a = lerp(-0.4, -0.08, e) + Math.PI / 2;
        const r = lerp(0.18, 0.5, e);
        const h = lerp(1.35, 3.1, e);
        K.cam([53 + Math.cos(a) * r, h, 14.5 + Math.sin(a) * r], [53, 0, 14.5], 46);
      } else if (phase === 1) {
        // o ponto de vista deles: o céu abrindo entre as nuvens, a lua
        K.sky('#01030a', '#0f2148', 1);
        K.floor({ x0: 50, y0: 3.5, x1: 56, y1: 9.5, z: 14, img: moonCv(), color: '#ffffff', em: true, alpha: seg(t, 10, 80) * 0.95 + 0.05 });
        [[-1, 49, 6, 1.15], [1, 55, 4, 1.0], [-1, 47, 10, 1.0], [1, 57, 9, 0.9], [-1, 52, 13, 0.8], [1, 56, 15, 1.1]].forEach(([dir, x, y, s], j) => {
          const cx = x + dir * t * 0.05;
          K.floor({ x0: cx - 4 * s, y0: y - 2 * s, x1: cx + 4 * s, y1: y + 2 * s, z: 11 + j * 0.2, img: cloudCv(), color: '#ffffff' });
        });
        K.cam([53 + t * 0.002, 0.25, 15.2], [53.2 + t * 0.003, 6, 11.5], 58);
      } else if (phase === 2) {
        // o rosto do Rin deitado na grama molhada: a raiva... e o quase sorriso
        const face = t < 96 ? null : t < 108 ? 'closed' : t < 140 ? 'calm' : 'smile';
        const rinCh = face && face !== 'closed' ? CE.cineChar('rin', KIT_RIN) : CE.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
        poseFloor(K, lying('rin', rinCh, true, face), { x: 52.25, y: 14.35, light: [0.6, 0.68, 0.85] });
        const z = easeIO(t / 210);
        const hx = 52.25 + 0.16;
        K.cam([hx + 0.02, lerp(1.55, 1.4, z), 14.52 + 0.12], [hx, 0, 14.42], 32);
      } else if (phase === 3) {
        // o placar do estádio, de baixo
        lieBoth(K);
        const e = K.easeIO(k);
        K.cam([53.3, 0.22, lerp(13.4, 12.9, e)], [53, lerp(2.6, 2.85, e), 5.9], lerp(48, 42, e));
      } else {
        // o ranking final no telão; os dois deitados lá embaixo
        lieBoth(K, { light: [0.45, 0.75, 0.8] });
        const e = K.easeIO(seg(t, 0, 120));
        K.cam(K.mix([53, 0.9, 15.6], [53, 1.6, 12.4], e), K.mix([53, 0.6, 12], [53, 2.9, 5.9], e), lerp(50, 46, e));
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      const [sh, sa] = this.finScore();
      if (phase === 0) {
        // vapor da respiração subindo para a câmera
        [[52.75, 14.4], [53.25, 14.6]].forEach(([x, y], j) => {
          const p = scr(K, x, 0.05, y);
          if (!p) return;
          for (let i = 0; i < 2; i++) {
            const ph = (t * 0.018 + i * 0.5 + j * 0.25) % 1;
            ctx.fillStyle = `rgba(226,232,240,${(1 - ph) * 0.16})`;
            ctx.beginPath();
            ctx.ellipse(p.x + (j ? 1 : -1) * ph * 26, p.y - ph * 14, 6 + ph * 26, 5 + ph * 18, 0, 0, TAU);
            ctx.fill();
          }
        });
        this.cineRain(ctx, W, H, t, 0.14, 70, 0.1);
        this.finKicker(ctx, 40, top + 32, `FIM DE JOGO • VOCÊ ${sh} x ${sa} RIN`, seg(t, 20, 70), '#38bdf8');
      } else if (phase === 1) {
        const sk = seg(t, 118, 142);
        if (sk > 0 && sk < 1) {
          const sx = lerp(300, 1000, sk);
          const sy = lerp(top + 60, top + 130, sk);
          const sg = ctx.createLinearGradient(sx, sy, sx - 160, sy - 31);
          sg.addColorStop(0, 'rgba(255,255,255,0.95)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = sg;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 160, sy - 31);
          ctx.stroke();
        }
        // as últimas gotas caindo na lente (cada vez menos)
        const nDrops = Math.round(26 * (1 - seg(t, 0, 150)));
        for (let i = 0; i < nDrops; i++) {
          const ph = (t * 0.03 + rnd(i, 70)) % 1;
          const a = rnd(i, 71) * TAU;
          const d = 30 + ph * ph * 520;
          ctx.fillStyle = `rgba(191,219,254,${0.3 + ph * 0.5})`;
          ctx.beginPath();
          ctx.arc(640 + Math.cos(a) * d, 360 + Math.sin(a) * d * 0.7, 1 + ph * 4, 0, TAU);
          ctx.fill();
        }
        [[320, 0], [960, 0.5]].forEach(([x, o]) => {
          const ph = (t * 0.016 + o) % 1;
          ctx.fillStyle = `rgba(226,232,240,${(1 - ph) * 0.18})`;
          ctx.beginPath();
          ctx.ellipse(x, bot + 20 - ph * 160, 60 + ph * 80, 30 + ph * 40, 0, 0, TAU);
          ctx.fill();
        });
        [[34, 300, 'hah...'], [70, 940, 'hah...'], [108, 330, '...hah.']].forEach(([at, x, s]) => {
          const kk = seg(t, at, at + 50);
          if (kk <= 0 || kk >= 1) return;
          ctx.save();
          ctx.globalAlpha = Math.sin(kk * Math.PI) * 0.8;
          ctx.font = 'italic 800 26px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(s, x, bot - 70 - kk * 70);
          ctx.restore();
        });
      } else if (phase === 2) {
        // gotas no rosto e a luz fria de lado
        ctx.save();
        ctx.fillStyle = 'rgba(219,234,254,0.85)';
        [[0.42, 0.34], [0.6, 0.56], [0.38, 0.6], [0.63, 0.38]].forEach(([fx, fy]) => ctx.fillRect(W * fx, top + (bot - top) * fy, 7, 7));
        ctx.fillRect(W * 0.61, top + (bot - top) * (0.45 + seg(t, 20, 200) * 0.12), 6, 10);
        ctx.restore();
        const lg = ctx.createLinearGradient(0, 0, W, 0);
        lg.addColorStop(0, 'rgba(147,197,253,0.12)');
        lg.addColorStop(0.5, 'rgba(147,197,253,0)');
        lg.addColorStop(1, 'rgba(2,6,23,0.45)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, W, H);
      } else if (phase === 3) {
        const fog = ctx.createLinearGradient(0, bot - 160, 0, bot);
        fog.addColorStop(0, 'rgba(203,213,225,0)');
        fog.addColorStop(1, 'rgba(203,213,225,0.14)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, bot - 160, W, 160);
        this.finLensDrops(ctx, W, top, bot, 4, 10);
      } else {
        const land = 92;
        if (t >= land) {
          const kk = seg(t, land, land + 14);
          this.cineImpactText(ctx, 'Nº 1', 1090, bot - 82, 104, '#facc15', kk, 0, -0.08);
          const kp = ease(seg(t, land + 8, land + 60));
          this.drawPuzzle3D(ctx, 1150, top + 150 - (1 - kp) * 200, 82, (1 - kp) * 9, -0.12 * kp, 'Nº1', kp);
          this.cineFlash(ctx, W, H, (1 - kk) * 0.45, '#fef3c7');
          this.cineSfx(S, land, 'numero1', () => window.SFX?.goal?.(true));
        }
        if (t > 150) this.finKicker(ctx, 40, bot - 40, 'A ÚLTIMA PEÇA DO QUEBRA-CABEÇA', seg(t, 150, 200), '#facc15');
      }
    }
  });

  // ==========================================================================
  // 5. A BOLA DE OURO — Paris (área vazia): o teatro → o tapete → o envelope → o palco
  // ==========================================================================
  // O teatro por dentro (também usado na cine3d_bola_ouro): palco ao norte (y 9–12,4),
  // plateia em degraus de y 13,4 a 21,4 (corredor no meio, x 85,6–86,4), porta dos fundos
  // no alto do corredor (y 22,4). Cada fileira sobe RAKE de altura.
  const TH = { x0: 80.4, x1: 91.6, stageY0: 9.0, stageY1: 12.4, stageZ: 0.32, row0: 13.6, rows: 8, step: 1.0, rake: 0.13, aisle: [85.6, 86.4], door: 22.4 };
  CE.C3F_THEATRE = TH;
  const rowY = (r) => TH.row0 + r * TH.step;
  const rowZ = (r) => r * TH.rake;
  // as poltronas de uma fileira: [x] dos lugares (fora do corredor)
  const SEATS = [];
  for (let x = TH.x0 + 0.55; x < TH.x1 - 0.3; x += 0.62) if (x < TH.aisle[0] - 0.2 || x > TH.aisle[1] + 0.2) SEATS.push(x);
  CE.C3F_SEATS = SEATS;
  const curtainRedCv = () =>
    canvas('curtainred', 64, 128, (g, w, h) => {
      for (let x = 0; x < w; x += 8) {
        const gr = g.createLinearGradient(x, 0, x + 8, 0);
        gr.addColorStop(0, '#5b0a14');
        gr.addColorStop(0.5, '#9f1239');
        gr.addColorStop(1, '#4c0519');
        g.fillStyle = gr;
        g.fillRect(x, 0, 8, h);
      }
      g.fillStyle = '#facc15';
      g.fillRect(0, h - 4, w, 2);
    });
  const galaWallCv = () =>
    canvas('galawall', 128, 128, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#0b0614'], [1, '#1b1028']]);
      g.strokeStyle = 'rgba(250,204,21,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w / 2, h * 0.55, 40, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, h * 0.55, 50, 0, TAU);
      g.stroke();
    });
  const goldBallCv = () =>
    canvas('goldball', 64, 96, (g) => {
      CE.finGoldBall(g, 32, 34, 22, 0);
    });
  const lecternCv = () =>
    canvas('lectern', 64, 96, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#24142e'], [1, '#05030a']]);
      g.fillStyle = '#ca8a04';
      g.fillRect(0, 0, w, 5);
      g.strokeStyle = '#facc15';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w / 2, 34, 12, 0, TAU);
      g.stroke();
      g.fillStyle = '#fde68a';
      g.beginPath();
      g.arc(w / 2, 34, 5, 0, TAU);
      g.fill();
    });
  function theatre(K, o = {}) {
    const { x0, x1, stageY0, stageY1, stageZ } = TH;
    K.ambient(o.amb || '#8a6a7a');
    K.sky('#030108', '#0b0614', 0);
    K.fog('#07040d', o.fogK ?? 0.03);
    // o palco (tábuas escuras, a borda dourada) e o fundo com os anéis
    K.box({ x0: x0 + 1.2, y0: stageY0, x1: x1 - 1.2, y1: stageY1, z0: 0, z1: stageZ, color: '#1b1028', top: '#2a1a36' });
    K.box({ x0: x0 + 1.2, y0: stageY1 - 0.04, x1: x1 - 1.2, y1: stageY1, z0: stageZ - 0.03, z1: stageZ + 0.005, color: '#ca8a04', em: true });
    pic(K, { x: (x0 + x1) / 2, y: stageY0, z: 0, w: x1 - x0 - 2.4, h: 3.2, ang: Math.PI / 2, img: galaWallCv(), color: '#ffffff', light: [0.8, 0.75, 0.85] });
    // as cortinas vermelhas dos lados do palco
    [x0 + 1.6, x1 - 1.6].forEach((x) => K.quad({ x, y: stageY1 - 0.1, z: 0, w: 1.0, h: 3.2, ang: Math.PI / 2, img: curtainRedCv(), color: '#ffffff', light: [0.85, 0.7, 0.75] }));
    K.quad({ x: (x0 + x1) / 2, y: stageY1 - 0.12, z: 2.6, w: x1 - x0 - 2.4, h: 0.6, ang: Math.PI / 2, img: curtainRedCv(), color: '#ffffff', light: [0.85, 0.7, 0.75] });
    // o piso da plateia, as paredes, os degraus e as poltronas
    K.floor({ x0, y0: stageY1, x1, y1: TH.door + 0.6, z: 0.004, color: '#12060c' });
    K.quad({ x: x0, y: 16.5, z: 0, w: 15, h: 3.6, ang: 0, img: galaWallCv(), color: '#ffffff', light: [0.55, 0.5, 0.6] });
    K.quad({ x: x1, y: 16.5, z: 0, w: 15, h: 3.6, ang: Math.PI, img: galaWallCv(), color: '#ffffff', light: [0.55, 0.5, 0.6] });
    for (let r = 0; r < TH.rows; r++) {
      const y = rowY(r);
      const z = rowZ(r);
      if (r > 0) K.box({ x0, y0: y - 0.5, x1, y1: y + 0.5, z0: 0, z1: z, color: '#1a0810', top: '#2a0a12' });
      if (o.seats !== false) {
        [[x0 + 0.2, TH.aisle[0] - 0.02], [TH.aisle[1] + 0.02, x1 - 0.2]].forEach(([a, b]) => {
          K.box({ x0: a, y0: y + 0.18, x1: b, y1: y + 0.32, z0: z, z1: z + 0.36, color: '#7f1d1d', top: '#991b1b' });
          K.box({ x0: a, y0: y - 0.05, x1: b, y1: y + 0.2, z0: z, z1: z + 0.16, color: '#5b0a14', top: '#7f1d1d' });
        });
      }
    }
    // a parede do fundo com a porta (e a plaquinha verde de saída)
    const dz = rowZ(TH.rows);
    K.box({ x0, y0: TH.door - 0.5, x1, y1: TH.door + 0.6, z0: 0, z1: dz, color: '#1a0810', top: '#2a0a12' });
    K.quad({ x: (x0 + x1) / 2, y: TH.door + 0.6, z: dz, w: x1 - x0, h: 2.6, ang: -Math.PI / 2, img: galaWallCv(), color: '#ffffff', light: [0.45, 0.4, 0.5] });
    pic(K, { x: 86, y: TH.door + 0.58, z: dz + 1.32, w: 0.42, h: 0.14, ang: -Math.PI / 2, img: canvas('saida', 64, 20, (g, w, h) => {
      g.fillStyle = '#052e16';
      g.fillRect(0, 0, w, h);
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#4ade80';
      g.fillText('SAÍDA', w / 2, h / 2 + 1);
    }), color: '#ffffff', em: true });
    // arandelas douradas nas paredes
    for (let y = 14; y < 22; y += 2.6) {
      [x0 + 0.03, x1 - 0.03].forEach((x) => K.sprite(glowCv('rgba(251,191,36,0.7)'), { x, y, z: 1.6, w: 0.5, h: 0.5, glow: true }));
    }
  }
  // a plateia: um figurante por poltrona (pula o lugar de quem a cena pedir)
  const audience = (K, o = {}) => {
    const L = extras(o.seed || 21, 64, { clothes: ['#111827', '#1f2937', '#0f172a', '#3f1d2b', '#1e1b4b'] });
    let i = 0;
    for (let r = o.r0 || 0; r < (o.r1 ?? TH.rows); r++) {
      SEATS.forEach((x, j) => {
        if ((j + r) % (o.sparse || 2) !== 0) return;
        if (o.skip && o.skip(r, x)) return;
        if (i >= (o.max || 44)) return;
        const rise = o.rise ? o.rise(r, j) : 0;
        K.actor(L[i % L.length], { id: 'pl' + i, x: x + (r % 2) * 0.1, y: rowY(r) + 0.06, z: rowZ(r) - 0.3 + rise * 0.3, face: o.face || [86, 9], frame: o.frame ?? 0, k: 0.86, light: o.light, anim: o.anim });
        i++;
      });
    }
  };
  CE.c3fTheatre = theatre;
  CE.c3fAudience = audience;
  CE.c3fGoldBall = goldBallCv;
  CE.c3fLectern = lecternCv;
  // o lado de fora: a cidade de Paris com a torre ao fundo, a fachada do teatro e o tapete
  const parisCv = () =>
    canvas('paris', 1024, 512, (g, w, h) => {
      CE.cineCity(g, w, h - 10, 190, '#160f2e', 'rgba(253,224,71,0.45)', 7, 0);
      CE.cineCity(g, w, h, 120, '#0a0718', 'rgba(251,191,36,0.55)', 9, 200);
      CE.finEiffel(g, 300, h - 40, 420, 0);
    });
  const facadeGalaCv = () =>
    canvas('facadegala', 512, 256, (g, w, h) => {
      g.fillStyle = '#2a1f3d';
      g.fillRect(0, 20, w, h - 20);
      g.fillStyle = '#1d1530';
      g.fillRect(0, 0, w, 26);
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 82;
        g.fillStyle = '#3a2d52';
        g.fillRect(x, 120, 18, 136);
        g.fillStyle = 'rgba(217,119,6,0.65)';
        g.beginPath();
        g.moveTo(x + 26, 256);
        g.lineTo(x + 26, 170);
        g.arc(x + 48, 170, 22, Math.PI, 0);
        g.lineTo(x + 70, 256);
        g.fill();
      }
    });
  const marqueeCv = (g, w, h, t) => {
    g.fillStyle = '#120a20';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#facc15';
    g.lineWidth = 3;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.font = 'italic 900 34px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fde68a';
    g.fillText('BOLA DE OURO', w / 2, h / 2 + 2);
    for (let i = 0; i < 24; i++) {
      const bx = 12 + (i % 12) * ((w - 24) / 11);
      const by = i < 12 ? 6 : h - 6;
      const a = 0.45 + 0.55 * Math.max(0, Math.sin(t * 0.12 - i * 0.7));
      g.fillStyle = `rgba(254,240,138,${a})`;
      g.fillRect(bx - 2, by - 2, 4, 4);
    }
  };
  const logoWallCv = () =>
    canvas('logowall', 512, 192, (g, w, h) => {
      g.fillStyle = '#0f0a24';
      g.fillRect(0, 0, w, h);
      g.font = 'italic 900 14px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          g.fillStyle = (r + c) % 2 ? 'rgba(250,204,21,0.6)' : 'rgba(250,204,21,0.28)';
          g.fillText('BOLA DE OURO', 70 + c * 130 + (r % 2) * 60, 18 + r * 32);
        }
      }
    });
  // o tapete vermelho na frente do teatro (x 85,3–86,7), com os pedestais e a corda
  const CARPET = { x0: 85.3, x1: 86.7, y0: 12.2, y1: 26 };
  function parisOutside(K, S, o = {}) {
    K.sky('#020617', '#3b2a6b', 0.5);
    K.fog('#0b0618', 0.012);
    K.ambient('#b48a6a');
    K.floor({ x0: 70, y0: -30, x1: 104, y1: 40, z: -0.005, color: '#050309' });
    pic(K, { x: 82, y: -24, z: -2, w: 76, h: 38, ang: Math.PI / 2, img: parisCv(), color: '#ffffff', em: true });
    // a fachada do teatro e o letreiro com as lâmpadas correndo
    K.box({ x0: 79, y0: 6, x1: 93, y1: 12, z0: 0, z1: 5.4, color: '#1d1530', top: '#140d22' });
    pic(K, { x: 86, y: 12.01, z: 0, w: 14, h: 5.2, ang: Math.PI / 2, img: facadeGalaCv(), color: '#ffffff', light: [0.85, 0.7, 0.6] });
    const mq = live('marquee', 400, 70, S, 3, (g, w, h) => marqueeCv(g, w, h, S.t));
    pic(K, { x: 86, y: 12.05, z: 2.55, w: 3.6, h: 0.63, ang: Math.PI / 2, img: mq.cv, dirty: mq.dirty, color: '#ffffff', em: true });
    // o painel de logos na porta e o tapete com a borda dourada
    pic(K, { x: 86, y: 12.12, z: 0, w: 3.4, h: 1.3, ang: Math.PI / 2, img: logoWallCv(), color: '#ffffff', light: [1, 0.9, 0.8] });
    K.floor({ x0: CARPET.x0, y0: CARPET.y0, x1: CARPET.x1, y1: CARPET.y1, z: 0.01, color: '#991b1b' });
    [CARPET.x0, CARPET.x1].forEach((x) => K.floor({ x0: x - 0.03, y0: CARPET.y0, x1: x + 0.03, y1: CARPET.y1, z: 0.012, color: '#facc15', em: true }));
    // pedestais dourados com a corda de veludo
    [-1, 1].forEach((s) => {
      const x = 86 + s * 0.95;
      for (let y = 13; y <= 22; y += 1.5) {
        K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.42, color: '#ca8a04' });
        K.box({ x0: x - 0.05, y0: y - 0.05, x1: x + 0.05, y1: y + 0.05, z0: 0.42, z1: 0.48, color: '#fde047', em: true });
        if (y < 22) K.box({ x0: x - 0.015, y0: y, x1: x + 0.015, y1: y + 1.5, z0: 0.34, z1: 0.38, color: '#7f1d1d' });
      }
    });
    // os fotógrafos dos dois lados (silhuetas com câmera)
    const L = extras(31, 16, { clothes: ['#020105', '#0b0b12', '#111827'] });
    for (let i = 0; i < (o.photogs ?? 14); i++) {
      const s = i % 2 ? 1 : -1;
      const y = 13.4 + Math.floor(i / 2) * 1.25;
      const x = 86 + s * (1.4 + (i % 4 < 2 ? 0 : 0.5));
      K.actor(L[i], { id: 'fot' + i, x, y, face: [86, y + 0.6], frame: 0, k: 0.86, light: [0.35, 0.28, 0.3] });
    }
  }
  // flashes dos fotógrafos (estrelinhas na tela sobre a cabeça deles)
  const photoFlashes = (ctx, S, K, n = 14) => {
    for (let i = 0; i < n; i++) {
      const ph = (S.f + i * 37) % 61;
      if (ph >= 6) continue;
      const s = i % 2 ? 1 : -1;
      const y = 13.4 + Math.floor(i / 2) * 1.25;
      const x = 86 + s * (1.4 + (i % 4 < 2 ? 0 : 0.5));
      const p = scr(K, x - s * 0.15, 0.82, y + 0.15);
      if (p) CE.finSparkle(ctx, p.x, p.y, 16, 1 - ph / 6);
    }
  };
  const presenter = { name: 'Apresentadora', skinColor: '#f1c9a5', hairColor: '#facc15', hairSecondary: '#ca8a04', eyeColor: '#1e3a8a', hairStyle: 'chigiri_long', outfit: 'casual', clothesColor: '#0b0b12', jerseyPrimary: '#0b0b12', jerseySecondary: '#facc15' };
  CE.C3F_PRESENTER = presenter;
  const envelopeCv = () =>
    canvas('envelope', 256, 160, (g, w, h) => {
      const P = 6;
      const ex = 40;
      const ew = w - 80;
      const eg = g.createLinearGradient(ex, 0, ex + ew, 0);
      eg.addColorStop(0, '#a16207');
      eg.addColorStop(0.45, '#fcd34d');
      eg.addColorStop(1, '#b45309');
      g.fillStyle = eg;
      g.fillRect(ex, 20, ew, h - 30);
      g.fillStyle = 'rgba(120,53,15,0.35)';
      poly(g, [[ex, 20], [w / 2, 90], [ex + ew, 20]]);
      g.fill();
      g.strokeStyle = '#78350f';
      g.lineWidth = 3;
      g.strokeRect(ex, 20, ew, h - 30);
      g.fillStyle = '#7f1d1d';
      g.beginPath();
      g.arc(w / 2, 92, 12, 0, TAU);
      g.fill();
      // as mãos (blocos de pixel) segurando dos dois lados
      const blk = (x, y, ww, hh, c) => {
        g.fillStyle = c;
        g.fillRect(x, y, ww * P, hh * P);
      };
      [[ex - 3 * P, 80, false], [ex + ew - 2 * P, 80, true]].forEach(([x, y, flip]) => {
        blk(x, y, 5, 4, '#f1c9a5');
        blk(x, y + 3 * P, 5, 1, '#d9a77f');
        blk(x + (flip ? 5 : -4) * P, y - P, 4, 6, '#0b0b12');
      });
    });
  const cardCv = (name) =>
    canvas('card|' + name, 220, 190, (g, w, h) => {
      g.fillStyle = '#fffbeb';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ca8a04';
      g.lineWidth = 3;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 900 15px Georgia, serif';
      g.fillStyle = '#a16207';
      g.fillText('BOLA DE OURO', w / 2, 30);
      g.fillRect(w / 2 - 40, 44, 80, 2);
      g.font = 'italic 900 26px "Segoe UI", sans-serif';
      g.fillStyle = '#0b1120';
      g.fillText(name, w / 2, 86, w - 24);
      g.font = '800 11px "Segoe UI", sans-serif';
      g.fillStyle = '#475569';
      g.fillText('JAPÃO', w / 2, 116);
    });

  CE.registerCine3D('ballon_dor', {
    phases: [180, 190, 180, 210, 200],
    music: 'epic',
    title: '🏆 A BOLA DE OURO',
    tags: ['PLANO 1 • PARIS', 'PLANO 2 • O TAPETE VERMELHO', 'PLANO 3 • O ENVELOPE', 'PLANO 4 • A BOLA DE OURO', 'PLANO 5 • DE PÉ'],
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'Paris inteira espera um nome.', color: '#94a3b8' }],
      [{ from: 15, who: 'NARRADOR', text: 'Ninguém mais erra o seu nome.', color: '#94a3b8' }],
      [{ from: 6, who: 'APRESENTADORA', text: '"O envelope, por favor."', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR', text: 'O troféu mais pesado... pesa tão pouco.', color: '#94a3b8' }],
      [{ from: 8, who: 'NARRADOR', text: 'O nº 1 do mundo se levanta primeiro.', color: '#94a3b8' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      const name = CE.cinePlayerName();
      if (phase === 0) {
        // a torre acesa → a câmera desce até o teatro e o tapete vermelho
        parisOutside(K, S);
        const e = K.easeIO(k);
        K.cam(K.mix([84.5, 7.5, 30], [86.3, 0.9, 25.5], e), K.mix([78, 9, -20], [86, 1.3, 12], e), lerp(44, 50, e));
      } else if (phase === 1) {
        // o tapete vermelho: você vindo de terno, os fotógrafos dos dois lados
        parisOutside(K, S);
        const w = K.easeIO(seg(t, 0, 190));
        const y = lerp(14.2, 18.6, w);
        K.actor('you', { x: 86, y, ang: Math.PI / 2, extra: { outfit: 'suit' }, anim: 'run', frame: 1 + (Math.floor(S.f / 7) % 4) * 4, k: 0.9, light: [1.15, 1.0, 0.85] });
        const n = K.noise(S.f * 0.8, 3) * 0.01;
        K.cam([86.15 + n, 0.72, y + 2.3], [86, 0.62, y - 0.4], 44);
      } else if (phase === 2) {
        // de perto: as mãos da apresentadora tirando o cartão do envelope dourado
        theatre(K, { amb: '#9a7a8a' });
        K.actor(presenter, { id: 'host', x: 86, y: 11.0, z: TH.stageZ, ang: Math.PI / 2, frame: 45, k: 0.92, light: [1.0, 0.88, 0.8] });
        const pull = easeIO(seg(t, 28, 150));
        const ez = TH.stageZ + 0.36;
        pic(K, { x: 86, y: 11.22, z: ez + 0.04 + pull * 0.26, w: 0.36, h: 0.31, ang: Math.PI / 2, img: cardCv(name), color: '#ffffff', light: [1.15, 1.05, 0.95] });
        pic(K, { x: 86, y: 11.25, z: ez, w: 0.56, h: 0.35, ang: Math.PI / 2, img: envelopeCv(), color: '#ffffff', light: [1.15, 1.0, 0.85] });
        const kk = easeIO(k);
        const n = K.noise(S.f * 0.9, 6) * 0.004;
        K.cam([86.05 + n, ez + 0.2 + pull * 0.2, 12.5 - kk * 0.1], [86, ez + 0.16 + pull * 0.2, 11.2], 30);
      } else if (phase === 3) {
        // no palco: você com a Bola de Ouro, dois canhões de luz
        theatre(K, { amb: '#7a5a6a' });
        K.actor('you', { x: 86, y: 11.0, z: TH.stageZ, ang: Math.PI / 2, extra: { outfit: 'suit' }, frame: 45, k: 0.92, light: [1.25, 1.12, 0.92] });
        K.sprite(goldBallCv(), { x: 86, y: 11.14, z: TH.stageZ + 0.08, w: 0.26, h: 0.39, glow: true });
        [[83.6, -0.5], [88.4, 0.5]].forEach(([x, a]) => K.quad({ x, y: 11.2, z: TH.stageZ, w: 2.0, h: 3.4, ang: Math.PI / 2 + a * 0.2, img: beamCv('254,240,138'), em: true, color: '#ffffff', alpha: 0.4 }));
        K.floor({ x0: 85.3, y0: 10.5, x1: 86.7, y1: 11.6, z: TH.stageZ + 0.008, img: glowCv('rgba(254,240,138,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
        const kk = easeIO(k);
        K.cam([86.08, lerp(0.62, 0.72, kk), lerp(13.6, 13.0, kk)], [86, lerp(0.78, 0.82, kk), 11.0], 40);
      } else {
        // o Noa de pé aplaudindo → a câmera abre: o teatro inteiro de pé, você no palco
        theatre(K, { amb: '#8a6a7a' });
        const riseOf = (r, j) => ease(seg(t, 100 + (TH.rows - r) * 8 + (j % 5) * 3, 130 + (TH.rows - r) * 8 + (j % 5) * 3));
        audience(K, { seed: 21, r0: 0, max: 44, face: [86, 10], rise: riseOf, frame: 45, skip: (r, x) => r === 0 && Math.abs(x - 84.2) < 0.4 });
        const clapShut = Math.floor(t / 7) % 2 === 1;
        K.actor('noa', { x: 84.2, y: rowY(0) + 0.06, z: 0, ang: -Math.PI / 2, extra: { outfit: 'suit' }, anim: 'clap', frame: clapShut ? 6 : 0, k: 0.9, light: [1.05, 0.95, 0.85] });
        K.actor('you', { x: 86, y: 11.4, z: TH.stageZ, ang: Math.PI / 2, extra: { outfit: 'suit' }, frame: 45, k: 0.9, light: [1.2, 1.1, 0.9] });
        K.sprite(goldBallCv(), { x: 86, y: 11.54, z: TH.stageZ + 0.08, w: 0.26, h: 0.39, glow: true });
        const e = K.easeIO(seg(t, 40, 195));
        K.cam(K.mix([84.6, 0.74, 12.15], [86.2, 1.45, 10.2], e), K.mix([84.2, 0.62, rowY(0)], [86, 0.5, 17.5], e), lerp(38, 56, e));
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      const name = this.cinePlayerName();
      if (phase === 0) {
        // holofotes varrendo o céu (saindo de trás do teatro)
        const p = scr(K, 86, 5.4, 9);
        if (p) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          [[-120, 0.35], [120, -0.3]].forEach(([dx, ph]) => {
            const x = p.x + dx;
            const a = -Math.PI / 2 + Math.sin(t * 0.015 + ph * 6) * 0.45;
            const g = ctx.createLinearGradient(x, p.y, x + Math.cos(a) * 700, p.y + Math.sin(a) * 700);
            g.addColorStop(0, 'rgba(254,243,199,0.26)');
            g.addColorStop(1, 'rgba(254,243,199,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x, p.y);
            ctx.lineTo(x + Math.cos(a - 0.05) * 800, p.y + Math.sin(a - 0.05) * 800);
            ctx.lineTo(x + Math.cos(a + 0.05) * 800, p.y + Math.sin(a + 0.05) * 800);
            ctx.fill();
          });
          ctx.restore();
        }
        photoFlashes(ctx, S, K);
        this.cineBokeh(ctx, W, bot - 80, bot + 20, t, 10, ['rgba(251,191,36,0.4)', 'rgba(254,240,138,0.3)'], 12);
        this.finKicker(ctx, 40, top + 32, 'PARIS • THÉÂTRE DU CHÂTELET', seg(t, 8, 50), '#facc15');
      } else if (phase === 1) {
        photoFlashes(ctx, S, K);
        this.cineBokeh(ctx, W, top, top + 160, t, 14, ['rgba(251,191,36,0.35)', 'rgba(254,240,138,0.3)'], 14);
      } else if (phase === 2) {
        this.cineBokeh(ctx, W, top + 20, bot - 60, t, 16, ['rgba(251,191,36,0.3)', 'rgba(254,240,138,0.2)'], 16);
        const pull = easeIO(seg(t, 28, 150));
        if (pull > 0.98) this.cineGlow(ctx, 640, 300, 380, 'rgba(251,191,36,0.3)', seg(t, 150, 170));
        for (let i = 0; i < 6; i++) {
          const a = Math.max(0, Math.sin(t * 0.06 + i * 1.9));
          if (pull > 0.9) this.finSparkle(ctx, 360 + rnd(i, 80) * 560, top + 40 + rnd(i, 81) * 240, 9, a * 0.8);
        }
      } else if (phase === 3) {
        for (let i = 0; i < 70; i++) {
          const x = (i * 137.5 + Math.sin(t * 0.03 + i) * 30) % W;
          const y = ((i * 71 + t * (1.6 + (i % 4) * 0.5)) % (H + 40)) - 20;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * 0.08 + i);
          ctx.fillStyle = i % 3 ? '#facc15' : i % 2 ? '#fef3c7' : '#ca8a04';
          ctx.fillRect(-5, -2, 10, 4);
          ctx.restore();
        }
        const pb = scr(K, 86, TH.stageZ + 0.36, 11.14);
        if (pb) this.finSparkle(ctx, pb.x, pb.y, 14, 0.6 + 0.4 * Math.sin(t * 0.1));
        this.cineImpactText(ctx, 'BOLA DE OURO', W / 2, top + 64, 70, '#facc15', seg(t, 40, 54), W * 0.8);
        this.cineImpactText(ctx, name, W / 2, top + 130, 40, '#f8fafc', seg(t, 66, 80), W * 0.6);
        if (t >= 40) this.cineFlash(ctx, W, H, (1 - seg(t, 40, 54)) * 0.45, '#fef9c3');
        this.cineSfx(S, 40, 'bola', () => window.SFX?.goal?.(true));
      } else {
        const clapShut = Math.floor(t / 7) % 2 === 1;
        const p = scr(K, 84.2, 0.62, rowY(0));
        if (clapShut && p && t < 120) {
          ctx.font = 'italic 900 16px "Segoe UI", sans-serif';
          ctx.fillStyle = '#fde68a';
          ctx.textAlign = 'center';
          ctx.fillText('CLAP', p.x + 60, p.y - 20);
        }
        const pb = scr(K, 86, TH.stageZ + 0.36, 11.54);
        if (pb) this.finSparkle(ctx, pb.x, pb.y, 9, 0.6 + 0.4 * Math.sin(t * 0.1));
        if (t > 150) this.finKicker(ctx, W / 2, bot - 34, 'DE PÉ, O TEATRO INTEIRO', seg(t, 150, 190), '#facc15', 'center');
      }
    }
  });

  // ==========================================================================
  // 6. O DESTINO DE CADA UM — cada página vira uma sequência de cenários, com as mesmas
  // caixas de texto (nos mesmos tempos) da versão 2D
  // ==========================================================================
  // caixas de texto por página: [tempo, x, y(top +), w, nome, texto, cor]
  const EPI_BOXES = [
    [[52, 44, 30, 430, 'RIN ITOSHI', 'Todo dia, antes do sol nascer. Sozinho. Ainda caçando o número 1.', '#14b8a6']],
    [
      [22, 40, 28, 400, 'MEGURU BACHIRA', 'Voltou pro bairro. Agora o monstro dele tem alunos.', '#ca8a04'],
      [67, 40, 28, 400, 'NAGI & REO', '"Mais uma." (Era a décima. O Reo pagou o jogo novo.)', '#9333ea'],
      [117, 40, 28, 400, 'HYOMA CHIGIRI', 'Ninguém alcança. Nem a lesão.', '#e11d48']
    ],
    [
      [22, 40, 28, 400, 'RENSUKE KUNIGAMI', 'Voltou do fundo do poço. Treina em dobro: o herói agora é ele mesmo.', '#ea580c'],
      [67, 40, 28, 440, 'SAE ITOSHI', 'Em Madri. Ainda procura alguém que mereça o passe dele. Achou um.', '#db2777'],
      [117, 40, 28, 330, 'RYUSEI SHIDOU', 'Continua explodindo. O PXG já trocou a rede três vezes.', '#db2777']
    ],
    [
      [22, 40, 28, 380, 'KAISER & NESS', '"Da próxima vez, a coroa volta pra Alemanha." Eles também não esqueceram.', '#2563eb'],
      [82, 40, 28, 520, 'JINPACHI EGO', 'No escuro, de novo. Já está assistindo a próxima geração.', '#0d9488']
    ],
    [
      [20, 44, 30, 420, 'BRASIL', 'Um campinho de terra. Um garoto de 14 anos. Fome nos olhos.', '#16a34a'],
      [120, 760, 30, 300, '???', '"Hehehe... esse vai ficar caro."', '#b91c1c']
    ],
    []
  ];
  // cortes de cada página (o cenário troca quando entra o próximo quadro da 2D)
  const EPI_CUTS = [[110], [45, 95], [45, 95], [60], [], []];
  const grafCv = () =>
    canvas('graffiti', 512, 160, (g, w, h) => {
      g.fillStyle = '#4a2c3a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 16) g.fillRect(x + ((y / 16) % 2) * 16, y, 31, 1);
      [['#facc15', 80, 70, 60], ['#22d3ee', 230, 60, 52], ['#f472b6', 390, 80, 66]].forEach(([c, x, y, r]) => {
        g.fillStyle = c;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.ellipse(x, y, r, r * 0.5, 0.3, 0, TAU);
        g.fill();
      });
      g.globalAlpha = 1;
      g.font = 'italic 900 52px "Segoe UI", sans-serif';
      g.fillStyle = '#1e3a8a';
      g.fillText('MONSTRO', 120, 100);
    });
  const tvCv = (g, w, h, lt) => {
    CE.cineGradient(g, 0, 0, w, h, [[0, '#93c5fd'], [1, '#1d4ed8']]);
    CE.finPixelText(g, lt % 90 < 70 ? 'WIN' : 'GG', w / 2, h / 2, 5, '#f8fafc');
  };
  const nextGenCv = () =>
    canvas('nextgen', 512, 192, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#0f3b46'], [1, '#04161c']]);
      CE.finPixelText(g, 'PRÓXIMA', w / 2, h * 0.36, 5, '#00f5d4');
      CE.finPixelText(g, 'GERAÇÃO', w / 2, h * 0.68, 5, '#00f5d4');
      CE.finFillPat(g, 'scan', 0, 0, w, h, 0.8);
    });
  const favelaCv = () =>
    canvas('favela', 1024, 256, (g, w, h) => {
      for (let i = 0; i < 40; i++) {
        const x = i * 26 + (i % 3) * 6;
        const hgt = 40 + rnd(i, 100) * 90;
        const y = h - (i % 7) * 10 - hgt;
        g.fillStyle = ['#7c2d12', '#9a3412', '#a16207', '#1e3a8a', '#9d174d'][i % 5];
        g.fillRect(x, y, 30, hgt + 40);
        g.fillStyle = 'rgba(254,240,138,0.75)';
        if (rnd(i, 101) < 0.6) g.fillRect(x + 6, y + 10, 6, 6);
        if (rnd(i, 102) < 0.4) g.fillRect(x + 18, y + 24, 6, 6);
      }
    });
  const fenceCv = () =>
    canvas('fence', 256, 64, (g, w, h) => {
      g.strokeStyle = 'rgba(148,163,184,0.4)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = -64; x < w + 64; x += 10) {
        g.moveTo(x, 0);
        g.lineTo(x + 64, h);
        g.moveTo(x + 64, 0);
        g.lineTo(x, h);
      }
      g.stroke();
      g.fillStyle = '#111827';
      g.fillRect(0, 0, w, 3);
    });
  // trave pequena (campinho, colégio): três caixas brancas, a boca virada para ang
  const miniGoal = (K, x, y, w, h, along = 'x', color = '#e7e5e4') => {
    if (along === 'x') {
      K.box({ x0: x - w / 2 - 0.04, y0: y - 0.04, x1: x - w / 2, y1: y, z0: 0, z1: h, color });
      K.box({ x0: x + w / 2, y0: y - 0.04, x1: x + w / 2 + 0.04, y1: y, z0: 0, z1: h, color });
      K.box({ x0: x - w / 2 - 0.04, y0: y - 0.04, x1: x + w / 2 + 0.04, y1: y, z0: h - 0.04, z1: h, color });
    } else {
      K.box({ x0: x - 0.04, y0: y - w / 2 - 0.04, x1: x, y1: y - w / 2, z0: 0, z1: h, color });
      K.box({ x0: x - 0.04, y0: y + w / 2, x1: x, y1: y + w / 2 + 0.04, z0: 0, z1: h, color });
      K.box({ x0: x - 0.04, y0: y - w / 2 - 0.04, x1: x, y1: y + w / 2 + 0.04, z0: h - 0.04, z1: h, color });
    }
  };
  // poste de luz com o cone (x, y; a lâmpada a leste do poste)
  const lampPost = (K, x, y, rgb = '254,240,138') => {
    K.box({ x0: x - 0.04, y0: y - 0.04, x1: x + 0.04, y1: y + 0.04, z0: 0, z1: 2.4, color: '#0b1120' });
    K.box({ x0: x - 0.04, y0: y - 0.04, x1: x + 0.5, y1: y + 0.04, z0: 2.36, z1: 2.42, color: '#0b1120' });
    K.box({ x0: x + 0.36, y0: y - 0.08, x1: x + 0.56, y1: y + 0.08, z0: 2.3, z1: 2.36, color: `rgb(${rgb})`, em: true });
    K.sprite(glowCv(`rgba(${rgb},0.85)`), { x: x + 0.46, y, z: 2.0, w: 0.8, h: 0.8, glow: true });
    K.quad({ x: x + 0.46, y: y + 0.01, z: 0, w: 2.2, h: 2.35, ang: Math.PI / 2, img: beamCv(rgb), em: true, color: '#ffffff', alpha: 0.28 });
    K.floor({ x0: x - 0.7, y0: y - 0.9, x1: x + 1.6, y1: y + 0.9, z: 0.006, img: glowCv(`rgba(${rgb},0.55)`), color: '#ffffff', em: true, alpha: 0.999 });
  };
  const kid = (i, extra) => CE.finKid(i, extra);

  CE.registerCine3D('epilogue_destinies', {
    phases: [220, 220, 220, 210, 200, 210],
    music: 'promise',
    title: '📖 O DESTINO DE CADA UM',
    tags: ['PÁGINA 1 • RIN ITOSHI', 'PÁGINA 2 • BACHIRA • NAGI & REO • CHIGIRI', 'PÁGINA 3 • KUNIGAMI • SAE • SHIDOU', 'PÁGINA 4 • KAISER & NESS • EGO', 'PÁGINA 5 • DO OUTRO LADO DO MUNDO', 'PÁGINA 6 • E VOCÊ'],
    subs: [
      [{ from: 10, who: 'NARRADOR', text: 'Depois da Copa, cada egoísta seguiu o próprio caminho.', color: '#94a3b8' }],
      [],
      [],
      [],
      [{ from: 10, who: 'NARRADOR', text: 'E, do outro lado do mundo...', color: '#94a3b8' }],
      [{ from: 30, who: 'NARRADOR', text: '...você voltou pro lugar onde tudo começou.', color: '#94a3b8' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      camFix(K);
      const { t, phase } = S;
      const cuts = EPI_CUTS[phase];
      const part = cuts.filter((c) => t >= c).length;
      const lt = part ? t - cuts[part - 1] : t;
      const pdur = (part < cuts.length ? cuts[part] : S.dur) - (part ? cuts[part - 1] : 0);
      const k = lt / pdur;
      const e = K.easeIO(k);
      if (phase === 0) {
        // o campo do Blue Lock ao nascer do sol: o Rin chutando sozinho
        K.sky('#0b1446', '#f97316', 0.05);
        K.fog('#3b1d3a', 0.02);
        K.expo(1.05);
        const shotK = clamp((t % 80) / 50);
        const kick = t % 80 < 4 ? 'shoot' : t % 80 < 40 ? 'idle' : 'windup';
        K.actor('rin', { x: 53, y: 10.6, ang: -Math.PI / 2, extra: KIT_RIN, anim: kick, frame: 45, k: 0.9, light: [1.15, 0.85, 0.7] });
        K.ball(lerp(53.05, 52.6, shotK), lerp(10.3, 6.4, shotK), Math.sin(shotK * Math.PI) * 0.9 + 0.06);
        // bolas espalhadas na grama e dentro do gol
        [[52.3, 6.3], [53.4, 6.25], [52.9, 6.35], [54.4, 9.9], [51.6, 10.8]].forEach(([x, y]) => K.ball(x, y, 0.06, { k: 0.7 }));
        K.sprite(glowCv('rgba(253,186,116,0.9)'), { x: 70, y: 2, z: 1.4, w: 8, h: 8, glow: true });
        if (part === 0) K.cam([lerp(56.8, 56.2, e), 0.55, lerp(12.6, 12.2, e)], [52.6, 0.7, 8.6], 46);
        else K.cam([54.1 - e * 0.15, 0.6, 9.35], [53, 0.6, 10.6], 36);
      } else if (phase === 1) {
        if (part === 0) {
          // o bairro: o Bachira ensinando a molecada na quadra, o muro com o "MONSTRO"
          K.sky('#7c2d6b', '#f97316', 0);
          K.fog('#3b1d2b', 0.02);
          K.ambient('#e0a080');
          K.floor({ x0: 80, y0: 12, x1: 93, y1: 24, color: '#2a1e33' });
          K.floor({ x0: 81, y0: 13, x1: 91, y1: 21, z: 0.008, color: '#3b2840' });
          pic(K, { x: 86, y: 13, z: 0, w: 10, h: 2.4, ang: Math.PI / 2, img: grafCv(), color: '#ffffff' });
          miniGoal(K, 86, 13.3, 1.6, 0.7);
          const bx = 86 + Math.sin(lt * 0.14) * 0.8;
          K.actor('bachira', { x: 86, y: 15.6, ang: Math.PI / 2, extra: casual('#facc15'), frame: 45, k: 0.9 });
          K.actor(kid(0), { id: 'k0', x: 84.6, y: 16.4, face: [86, 15.6], frame: 45, k: 0.66 });
          K.actor(kid(1), { id: 'k1', x: 87.4, y: 16.2, face: [86, 15.6], anim: 'call_pass', frame: 45, k: 0.62 });
          K.actor(kid(2), { id: 'k2', x: 87.0, y: 17.2, face: [86, 15.6], frame: 45, k: 0.7 });
          K.ball(bx, 15.9, Math.abs(Math.sin(lt * 0.28)) * 0.3 + 0.06);
          K.cam([86.4 - e * 0.3, 0.7, 19.3 - e * 0.3], [86, 0.55, 15.4], 46);
        } else if (part === 1) {
          // a sala de jogos: o Nagi largado no sofá, o Reo de controle na mão, a TV acesa
          K.sky('#03050d', '#03050d', 0);
          K.fog('#03050d', 0.05);
          K.ambient('#5a78c8');
          K.floor({ x0: 82, y0: 12, x1: 90, y1: 20, color: '#0b1120' });
          const tv = live('epi_tv', 256, 150, S, 10, (g, w, h) => tvCv(g, w, h, lt));
          K.box({ x0: 84.7, y0: 13.0, x1: 87.3, y1: 13.15, z0: 0.35, z1: 1.35, color: '#0b1120' });
          pic(K, { x: 86, y: 13.16, z: 0.42, w: 2.4, h: 0.86, ang: Math.PI / 2, img: tv.cv, dirty: tv.dirty, color: '#ffffff', em: true });
          K.box({ x0: 84.6, y0: 15.6, x1: 87.0, y1: 16.3, z0: 0, z1: 0.26, color: '#1e1b4b', top: '#312e81' });
          const nagiCv = lying('nagi', CE.cineChar('nagi', casual('#cbd5e1')), false, null);
          poseSprite(K, nagiCv, { x: 85.75, y: 15.9, z: -0.06, light: [0.55, 0.65, 1.0] });
          K.actor('reo', { x: 87.6, y: 15.7, ang: -Math.PI / 2 - 0.4, extra: casual('#6d28d9'), frame: 45, k: 0.9, light: [0.6, 0.7, 1.05] });
          K.cam([86.7 + e * 0.2, 0.7, 18.4 - e * 0.2], [86.2, 0.5, 15.2], 44);
        } else {
          // o Chigiri: ninguém alcança (a câmera correndo do lado dele)
          K.sky('#0f2a4a', '#38bdf8', 0);
          K.fog('#0f2a4a', 0.02);
          K.expo(1.05);
          const x = lerp(47, 59, lt / pdur);
          K.actor('chigiri', { x, y: 15.5, ang: 0, kit: 'japan', anim: 'run', frame: S.f, k: 0.9, light: [1.15, 1.1, 1.1] });
          K.ball(x + 0.45, 15.55, 0.05 + Math.abs(Math.sin(S.f * 0.3)) * 0.06);
          K.cam([x - 0.2, 0.5, 17.6], [x + 0.25, 0.48, 15.5], 48);
        }
      } else if (phase === 2) {
        if (part === 0) {
          // o Kunigami treinando à noite, sozinho, debaixo do poste
          K.sky('#04070f', '#0d1f14', 0.4);
          K.fog('#04070f', 0.04);
          K.ambient('#3a4a5a');
          K.floor({ x0: 80, y0: 10, x1: 94, y1: 24, color: '#0d1f14' });
          lampPost(K, 85.3, 15.2);
          const shoot = lt % 70 >= 30;
          K.actor('kunigami', { x: 86.2, y: 15.6, ang: 0, frame: 45, anim: shoot ? 'shoot' : 'windup', k: 0.9, light: [1.2, 1.0, 0.75] });
          const bk = shoot ? ((lt % 70) - 30) / 40 : 0;
          K.ball(86.55 + bk * 4.5, 15.6, 0.08 + bk * 0.9);
          K.cam([84.7 + e * 0.3, 0.62, 18.3], [86.4, 0.75, 15.5], 46);
        } else if (part === 1) {
          // o Sae em Madri: o estádio cheio atrás, a bola no pé
          K.sky('#0b1126', '#1c1430', 0.3);
          K.expo(1.0);
          K.actor('sae', { x: 53, y: 12.2, ang: Math.PI / 2, extra: { jerseyPrimary: '#f8fafc', jerseySecondary: '#facc15' }, frame: 45, k: 0.9, light: [1.15, 1.05, 1.1] });
          K.ball(53.3, 12.35, 0.06);
          K.cam([53.4 - e * 0.2, 0.42, 14.4 - e * 0.2], [53, 0.72, 12.0], 42);
        } else {
          // o Shidou: a bicicleta, a estrela rosa, BOOM
          K.sky('#2a0a24', '#0a0410', 0.3);
          K.expo(1.0);
          K.actor('shidou', { x: 53, y: 12.0, z: 0.45, ang: 0, anim: 'bicycle', frame: 45, k: 0.95, light: [1.25, 0.9, 1.1], opts: { showAura: true } });
          K.ball(53.5, 12.0, 1.0);
          K.cam([52.3 + e * 0.2, 0.55, 14.6], [53.1, 0.85, 12.0], 48);
        }
      } else if (phase === 3) {
        if (part === 0) {
          // Kaiser e Ness na neve
          K.sky('#0b1a3a', '#1e3a5f', 0.2);
          K.fog('#1e3a5f', 0.04);
          K.ambient('#9ab0d8');
          K.floor({ x0: 78, y0: 8, x1: 96, y1: 26, color: '#e2e8f0' });
          for (let i = 0; i < 8; i++) K.box({ x0: 80 + i * 2.2, y0: 11 + (i % 3) * 0.6, x1: 81.2 + i * 2.2, y1: 11.8 + (i % 3) * 0.6, z0: 0, z1: 0.8 + (i % 4) * 0.5, color: '#132a52', top: '#e2e8f0' });
          K.actor('ness', { x: 85.4, y: 15.4, face: [86.6, 15.9], frame: 45, k: 0.88, light: [0.75, 0.8, 1.0] });
          K.actor('kaiser', { x: 86.6, y: 15.9, ang: Math.PI / 2, frame: 45, k: 0.92, light: [0.95, 1.0, 1.15] });
          K.cam([86.4 - e * 0.3, 0.62, 18.5 - e * 0.25], [86.1, 0.62, 15.6], 42);
        } else {
          // o Ego no escuro, de costas, assistindo a próxima geração no telão
          K.expo(0.8);
          screenQuad(K, Object.assign({}, TEL, { cv: nextGenCv() }));
          K.floor({ x0: 22.6, y0: 9.15, x1: 27.4, y1: 12.4, color: '#00f5d4', alpha: 0.08, em: true });
          K.actor('EGO', { x: 25, y: 11.6, ang: -Math.PI / 2, frame: 45, k: 0.95, light: [0.3, 0.55, 0.6] });
          K.cam([25.3, 0.72, 13.4 - e * 0.25], [25, 0.85, 9.2], 46);
        }
      } else if (phase === 4) {
        // Brasil: o campinho de terra no fim de tarde; o Fox no escuro, em primeiro plano
        K.sky('#3b0d4a', '#fdba74', 0);
        K.fog('#7c2d12', 0.02);
        K.ambient('#f0a070');
        K.floor({ x0: 78, y0: 6, x1: 96, y1: 26, color: '#9a4a1f' });
        pic(K, { x: 86, y: 6.5, z: -0.2, w: 22, h: 5.5, ang: Math.PI / 2, img: favelaCv(), color: '#ffffff', light: [0.95, 0.75, 0.6] });
        miniGoal(K, 84.2, 11.6, 1.5, 0.7, 'x', '#e7e5e4');
        const jb = Math.abs(Math.sin(t * 0.09));
        K.actor(kid(0, { name: 'Garoto do campinho', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a' }), { id: 'garoto', x: 86.4, y: 13.4, ang: Math.PI / 2, frame: 45, k: 0.8 });
        K.ball(86.62, 13.55, 0.08 + jb * 0.55);
        K.actor(CE.getSpeakerCharData('FOX'), { id: 'fox', x: 87.35, y: 16.3, ang: Math.PI / 2 + 0.3, frame: 45, k: 0.95, light: [0.16, 0.1, 0.09] });
        K.cam([86.9 - e * 0.15, 0.68, 17.9 - e * 0.15], [86.6, 0.55, 13.4], 46);
      } else {
        // e você: o campinho do colégio à noite, uma bola velha, a luz de um poste
        K.sky('#01030a', '#0c1c40', 0.6);
        K.fog('#030712', 0.035);
        K.ambient('#5a6a9a');
        K.floor({ x0: 76, y0: 4, x1: 98, y1: 26, color: '#0b2a1a' });
        K.quad({ x: 86, y: 11.5, z: 0, w: 14, h: 1.6, ang: Math.PI / 2, img: fenceCv(), color: '#ffffff', light: [0.6, 0.65, 0.8] });
        K.quad({ x: 86, y: 0, z: -1, w: 40, h: 9, ang: Math.PI / 2, img: cityCv('colegio', { seed: 21 }), color: '#ffffff', em: true });
        miniGoal(K, 88.6, 12.4, 2.0, 0.8, 'x', '#cbd5e1');
        lampPost(K, 84.6, 14.2);
        K.actor('you', { x: 86, y: 15.0, ang: Math.PI / 2, extra: casual('#1e3a8a'), frame: 45, k: 0.9, light: [1.05, 0.95, 0.75] });
        K.ball(86.32, 15.12, 0.06, { light: [0.8, 0.6, 0.45] });
        K.cam([86.2, lerp(0.75, 0.68, e), lerp(18.4, 17.4, e)], [86, 0.58, 14.8], lerp(46, 42, e));
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      // as caixas de texto da página
      const boxes = EPI_BOXES[phase] || [];
      boxes.forEach(([at, x, y, w, label, text, color], i) => {
        // no mesmo lugar só fica a caixa mais nova (a de quem está na tela)
        if (boxes.some(([at2, x2], j) => j > i && x2 === x && t >= at2)) return;
        this.finBox(ctx, x, top + y, w, label, text, color, seg(t, at, at + 14));
      });
      if (phase === 0) {
        if (t < 120) {
          // o título digitado embaixo, à esquerda
          const a = 1 - seg(t, 104, 118);
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(1,2,5,0.82)';
          ctx.fillRect(0, bot - 220, 640, 220);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.font = '900 15px "Segoe UI", sans-serif';
          ctx.fillStyle = '#00f5d4';
          ctx.fillText('E P Í L O G O', 60, bot - 170);
          ctx.font = 'italic 900 50px "Segoe UI", sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(this.cineType('O DESTINO', t / 30), 56, bot - 120);
          ctx.fillText(this.cineType('DE CADA UM', (t - 20) / 30), 56, bot - 66);
          ctx.fillStyle = '#00f5d4';
          ctx.fillRect(58, bot - 36, 380 * ease(t / 60), 4);
          ctx.restore();
        } else {
          const e = ease(seg(t, 110, 126));
          this.finPanel(ctx, [[632, bot - 230], [1256, bot - 240], [1256, bot - 14], [612, bot - 14]], () => {
            this.cineGradient(ctx, 600, bot - 250, 680, 250, [[0, '#1a0b1c'], [1, '#04060c']]);
            const dw = 600;
            this.finEyes(ctx, this.cineChar('rin'), 940 - dw / 2, bot - 120 - (dw / 14) * 3.1, dw, { ring: '#2dd4bf', iris: '#0f766e' });
            const lg = ctx.createLinearGradient(612, 0, 1256, 0);
            lg.addColorStop(0, 'rgba(2,6,23,0.6)');
            lg.addColorStop(1, 'rgba(249,115,22,0.18)');
            ctx.fillStyle = lg;
            ctx.fillRect(600, bot - 250, 680, 250);
          }, { dx: (1 - e) * 700 });
        }
      } else if (phase === 1) {
        if (t < 45) {
          ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
          ctx.fillStyle = '#fef9c3';
          ctx.textAlign = 'center';
          if (t > 30) ctx.fillText('UAAAU!', 900, top + 200);
        } else if (t >= 95) {
          this.drawSpeedLines(ctx, W, H, 'rgba(255,255,255,0.5)', 0.25);
          this.cineDust(ctx, W, H, t * 6, 20, 'rgba(226,232,240,0.6)', 11);
        }
      } else if (phase === 2) {
        if (t >= 95) {
          const p = scr(K, 53.4, 1.0, 12.0);
          if (p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(t * 0.01);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(244,114,182,0.4)';
            ctx.beginPath();
            for (let i = 0; i < 24; i++) {
              const r = i % 2 ? 70 : 220;
              const a = (i / 24) * TAU;
              if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.fill();
            ctx.restore();
          }
          this.cineImpactText(ctx, 'BOOM!', W * 0.66, bot - 110, 60, '#f9a8d4', clamp((t - 95) / 12), 0, -0.12);
        } else if (t >= 45) {
          this.cineBokeh(ctx, W, top, top + 200, t, 12, ['rgba(254,240,138,0.5)', 'rgba(255,255,255,0.4)'], 18);
        } else if (t % 70 >= 30) {
          this.drawSpeedLines(ctx, W, H, 'rgba(251,146,60,0.5)', 0.2);
        }
      } else if (phase === 3) {
        if (t < 60) {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 70; i++) {
            const x = (rnd(i, 90) * W + Math.sin(t * 0.03 + i) * 20) % W;
            const y = top + ((rnd(i, 91) * (bot - top) + t * (0.8 + rnd(i, 92)) * 1.6) % (bot - top));
            ctx.fillRect(x, y, 3 + (i % 2), 3 + (i % 2));
          }
          const p = scr(K, 86.6, 0.66, 15.9);
          if (p) {
            const ph = (t * 0.02) % 1;
            ctx.fillStyle = `rgba(241,245,249,${(1 - ph) * 0.35})`;
            ctx.beginPath();
            ctx.ellipse(p.x + 20 + ph * 40, p.y - ph * 30, 10 + ph * 26, 8 + ph * 16, 0, 0, TAU);
            ctx.fill();
          }
        }
      } else if (phase === 4) {
        this.cineDust(ctx, W, H, t, 30, 'rgba(253,186,116,0.6)', 13);
        // o Fox: só o sorriso aceso e o cigarro
        const pm = scr(K, 87.35, 0.6, 16.3);
        if (pm) {
          const u = Math.max(4, Math.abs((scr(K, 87.35, 0.0, 16.3)?.y ?? pm.y + 300) - pm.y) / 22);
          ctx.fillStyle = '#0a0f1c';
          ctx.fillRect(pm.x - 2.6 * u, pm.y - 0.7 * u, 5.2 * u, 1.5 * u);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(pm.x - 2.3 * u, pm.y - 0.55 * u, 4.6 * u, 0.75 * u);
          ctx.fillRect(pm.x - 0.6 * u, pm.y - 0.55 * u, 0.65 * u, 1.1 * u);
          ctx.fillRect(pm.x + 0.2 * u, pm.y - 0.55 * u, 0.65 * u, 1.1 * u);
          const cx = pm.x + 2.8 * u;
          const cy = pm.y + 0.3 * u;
          ctx.fillStyle = '#e7e5e4';
          ctx.fillRect(cx - 4, cy - 3, 30, 6);
          this.cineGlow(ctx, cx + 28, cy, 12, 'rgba(251,146,60,0.95)', 0.7 + 0.3 * Math.sin(t * 0.2));
          ctx.strokeStyle = 'rgba(214,211,209,0.28)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 18; i++) {
            const y = cy - i * 10;
            const x = cx + 28 + Math.sin(i * 0.6 - t * 0.06) * (6 + i * 1.4);
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        const e = ease(seg(t, 70, 86));
        if (e > 0) {
          this.finPanel(ctx, [[60, bot - 230], [400, bot - 240], [390, bot - 40], [60, bot - 40]], () => {
            ctx.fillStyle = '#1c0d05';
            ctx.fillRect(40, bot - 260, 380, 260);
            const dw = 380;
            this.finEyes(ctx, kid(0, { jerseyPrimary: '#facc15', jerseySecondary: '#16a34a' }), 228 - dw / 2, bot - 140 - (dw / 14) * 3.1, dw, { iris: '#1c0d05', ring: '#a16207', look: 1 });
          }, { dx: (1 - e) * -440 });
        }
      } else {
        this.cineDust(ctx, W, H, t, 24, 'rgba(254,240,138,0.6)', 17);
        const e = ease(seg(t, 100, 116));
        if (e > 0) {
          this.finPanel(ctx, [[0, top + 16], [W, top + 16], [W, top + 122], [0, top + 122]], () => {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, top, W, 150);
            const dw = 600;
            this.finEyes(ctx, this.cineYou(), 640 - dw / 2, top + 69 - (dw / 14) * 3.1, dw, {});
            this.drawSpeedLines(ctx, W, top + 140, 'rgba(0,245,212,0.5)', 0.18);
          }, { dx: (1 - e) * -W });
        }
        this.finBox(ctx, 760, bot - 150, 470, this.cinePlayerName(), 'Campeão do mundo. Bola de Ouro. Número 1. E continua com fome.', '#0d9488', seg(t, 130, 146));
      }
    }
  });

  // ==========================================================================
  // 7. O GOL DOS QUATRO EGOS — final da Copa Sub-20 (o campo do prédio como a Catedral).
  // O Japão ataca o gol norte (y 6,6); o ângulo é o canto alto da direita (x 53,9).
  // ==========================================================================
  const YOU_C = '#00f5d4';
  const SAE_C = '#f9a8d4';
  const RIN_C = '#22d3ee';
  const LOKI_C = '#facc15';
  const HUGO_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const KIT_GK_JP = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
  const KIT_GK_FR = { jerseyPrimary: '#22c55e', jerseySecondary: '#052e16' };
  const ANGLE = [53.9, 0.93, 6.62];
  // quem é quem (atores 3D)
  const WC = {
    you: (o) => ['you', Object.assign({ kit: 'japan' }, o)],
    sae: (o) => ['sae', Object.assign({ kit: 'japan' }, o)],
    rin: (o) => ['rin', Object.assign({ kit: 'japan', extra: { angry: true } }, o)],
    shidou: (o) => ['shidou', Object.assign({ kit: 'japan' }, o)],
    gaga: (o) => ['gagamaru', Object.assign({ extra: KIT_GK_JP }, o)],
    loki: (o) => ['loki', Object.assign({ kit: 'france' }, o)],
    hugo: (o) => ['hugo', Object.assign({ kit: 'france' }, o)],
    charles: (o) => ['charles', Object.assign({ kit: 'france' }, o)],
    kaiser: (o) => ['gen_france_mf', Object.assign({ kit: 'france' }, o)],
    lorenzo: (o) => ['gen_france_df', Object.assign({ kit: 'france' }, o)],
    gk: (o) => ['gk_france', Object.assign({ extra: KIT_GK_FR }, o)]
  };
  const A = (K, who, o) => {
    const [id, oo] = WC[who](o);
    return K.actor(id, oo);
  };
  // ponto numa curva quadrática em 3D
  const qb3 = (p0, p1, p2, k) => p0.map((v, i) => (1 - k) * (1 - k) * v + 2 * (1 - k) * k * p1[i] + k * k * p2[i]);
  // curva 3D projetada na tela (lista de pontos) até k
  const curve2d = (K, p0, p1, p2, k0, k1, n = 40) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const p = qb3(p0, p1, p2, lerp(k0, k1, i / n));
      const s = K.screen(p[0], p[1], p[2]);
      if (s) pts.push([s.x, s.y]);
    }
    return pts;
  };
  const strokePts = (ctx, pts, layers) => {
    if (pts.length < 2) return;
    layers.forEach(([col, lw, dash]) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      if (dash) {
        ctx.setLineDash(dash[0]);
        ctx.lineDashOffset = dash[1];
      }
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
    });
  };
  const schoolCv = () =>
    canvas('school', 1024, 320, (g, w, h) => {
      g.fillStyle = '#cdbd9c';
      g.fillRect(260, 90, 520, 230);
      g.fillStyle = '#7c6a4c';
      g.fillRect(250, 80, 540, 14);
      g.fillStyle = '#e7dcc4';
      g.fillRect(470, 40, 100, 60);
      g.fillStyle = '#334155';
      g.beginPath();
      g.arc(520, 70, 16, 0, TAU);
      g.fill();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
        g.fillStyle = rnd(r * 10 + c, 5) < 0.3 ? '#fdba74' : '#5b6b84';
        g.fillRect(280 + c * 50, 120 + r * 60, 32, 30);
      }
      g.fillStyle = '#3f6212';
      for (let i = 0; i < 18; i++) {
        g.beginPath();
        g.arc(i * 60 + (i % 2) * 20, h - 10, 40 + (i % 3) * 12, 0, TAU);
        g.fill();
      }
    });
  const KIT_SCHOOL = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  // o lance do plano 1 (posições no começo e no fim do plano)
  const P1POS = {
    lorenzo: [[51.8, 12.7], [52.4, 12.9]], charles: [[54.9, 12.4], [54.1, 12.8]], kaiser: [[53.7, 11.5], [53.45, 11.95]], sae: [[53.2, 13.3], [53.2, 13.3]],
    rin: [[55.2, 11.8], [55.9, 10.2]], hugo: [[55.0, 12.3], [55.7, 10.7]], loki: [[56.9, 13.8], [56.7, 13.6]], shidou: [[51.0, 11.9], [51.3, 10.9]], you: [[49.0, 14.0], [49.9, 12.0]]
  };
  const p1At = (who, k) => mix(P1POS[who][0], P1POS[who][1], k);
  const TAGS = [['sae', 'SAE ITOSHI', SAE_C, 62], ['hugo', 'HUGO', HUGO_C, 76], ['loki', 'JULIAN LOKI', LOKI_C, 90], ['you', null, YOU_C, 104]];
  // P5–P7: onde você está correndo
  const YX = 50.4;

  CE.registerCine3D('wc_final_goal', {
    phases: [210, 190, 214, 262, 190, 170, 170, 190, 200, 330],
    music: 'epic',
    title: '🏆 O GOL DOS QUATRO EGOS',
    tags: [
      "PLANO 1 • 90+5' — A CATEDRAL", 'PLANO 2 • O REI COM A BOLA', 'PLANO 3 • A ISCA', 'PLANO 4 • O PASSE QUE NINGUÉM VIU', 'PLANO 5 • VELOCIDADE DIVINA',
      'PLANO 6 • METAVISÃO', 'PLANO 7 • DESSA VEZ, O CHUTE', 'PLANO 8 • O ÂNGULO', 'PLANO 9 • O APITO FINAL', 'PLANO 10 • QUATRO EGOS'
    ],
    get subs() {
      const me = CE.cinePlayerName();
      return [
        [{ from: 14, who: 'NARRADOR', text: "90+5'. Japão 2 x 2 França.", color: NARR_C }],
        [{ from: 30, who: 'SAE ITOSHI', text: '(...Ali. Ninguém mais viu.)', color: SAE_C }],
        [
          { from: 4, to: 116, who: 'RIN ITOSHI', text: '"SAE! É MEU!"', color: '#2dd4bf' },
          { from: 116, who: 'HUGO', text: '"Te peguei."', color: HUGO_C }
        ],
        [
          { from: 16, to: 118, who: 'SAE ITOSHI', text: '"Receba."', color: SAE_C },
          { from: 118, who: me, text: '(Passar... ou chutar?)', color: YOU_C }
        ],
        [{ from: 20, who: 'JULIAN LOKI', text: '"Você não escapa de mim."', color: LOKI_C }],
        [{ from: 4, who: me, text: '(Eu já vi onde ela vai cair.)', color: YOU_C }],
        [{ from: 14, who: me, text: '(Dessa vez... eu chutei.)', color: YOU_C }],
        [{ from: 44, who: 'NARRADOR', text: 'GOOOOL DO JAPÃO!! 3 x 2!', color: '#facc15' }],
        [{ from: 36, who: 'NARRADOR', text: 'O JAPÃO É CAMPEÃO DO MUNDO!', color: '#facc15' }],
        [
          { from: 6, to: 108, who: 'SAE ITOSHI', text: '"Bom gol."', color: SAE_C },
          { from: 108, to: 196, who: 'RIN ITOSHI', text: '"Tch."', color: '#2dd4bf' },
          { from: 196, who: 'JULIAN LOKI', text: '"...Um instante."', color: LOKI_C }
        ]
      ];
    },
    theme: 'worldcup_final',
    scene(K, S) {
      camFix(K);
      const { t, phase, dur } = S;
      const k = t / dur;
      const f = Math.floor(S.f * 0.5);
      K.sky('#05030c', '#3a2c5c', 0.25);
      K.fog('#0b0812', 0.02);
      K.expo(1.02);
      if (phase === 0) {
        // a Catedral inteira; a grua desce até o lance
        const kk = K.easeIO(seg(t, 0, 196));
        ['lorenzo', 'charles', 'kaiser', 'rin', 'hugo', 'shidou', 'you'].forEach((w, i) => {
          const [x, y] = p1At(w, kk);
          A(K, w, { x, y, face: w === 'charles' || w === 'kaiser' || w === 'lorenzo' ? P1POS.sae[0] : [x, y - 1], anim: 'run', frame: f + i * 3 });
        });
        const [sx, sy] = P1POS.sae[0];
        A(K, 'sae', { x: sx, y: sy, ang: -Math.PI / 2, frame: 45 });
        A(K, 'loki', { x: P1POS.loki[0][0], y: P1POS.loki[0][1], face: [53, 12], frame: 45 });
        A(K, 'gk', { x: 53, y: 7.1, ang: Math.PI / 2, frame: 45 });
        K.ball(sx + 0.25, sy - 0.2, 0.06, { light: [1.2, 1.0, 1.1] });
        const n = K.noise(t * 0.4, 2) * 0.03;
        K.cam(K.mix([53 + n, 5.6, 25.0], [52.0 + n, 1.55, 17.6], kk), K.mix([53, 0, 12.5], [53, 0.4, 12.4], kk), lerp(56, 48, kk));
      } else if (phase === 1) {
        // o Sae com a bola, três franceses em cima (câmera rente ao chão, de frente pra ele)
        const kk = K.easeIO(k);
        A(K, 'sae', { x: 53.2, y: 13.3, ang: -Math.PI / 2, frame: 45, light: [1.25, 1.05, 1.15] });
        K.ball(53.42, 13.08, 0.06, { light: [1.2, 1.0, 1.1] });
        A(K, 'kaiser', { x: lerp(53.9, 53.6, kk), y: 14.4, face: [53.2, 13.3], anim: 'run', frame: Math.floor(f / 3), light: [0.5, 0.55, 0.75] });
        A(K, 'lorenzo', { x: lerp(51.9, 52.3, kk), y: 13.1, face: [53.2, 13.3], anim: 'run', frame: Math.floor(f / 3) + 2, light: [0.55, 0.5, 0.75] });
        A(K, 'charles', { x: lerp(54.6, 53.7, ease(k)), y: 12.2, face: [52, 12.2], anim: 'run', frame: Math.floor(f / 3) + 5, light: [0.3, 0.3, 0.42] });
        K.cam([53.05 + kk * 0.1, 0.42, 11.35 + kk * 0.1], [53.2, 0.58, 13.3], 42);
      } else if (phase === 2) {
        // o Rin dispara pedindo a bola; o Hugo colado nas costas dele
        const a = easeIn(seg(t, 0, 214));
        const ry = lerp(11.6, 10.2, t / 214);
        A(K, 'rin', { x: 55.6, y: ry, ang: -Math.PI / 2, anim: 'run', frame: f, light: [1.1, 1.25, 1.3] });
        A(K, 'hugo', { x: 55.95, y: ry + 0.55, ang: -Math.PI / 2, anim: 'run', frame: f + 2, light: [1.15, 0.85, 0.95] });
        const d = lerp(2.6, 1.55, a);
        const sh = K.noise(S.f * 1.6, 3) * 0.012;
        K.cam([55.65 + sh, 0.55 + Math.sin(t * 0.32) * 0.01, ry - d], [55.7, 0.6, ry + 0.3], 44);
      } else if (phase === 3) {
        const kick = 34;
        if (t < 72) {
          // a chuteira do Sae e a bola (câmera rente à grama)
          A(K, 'sae', { x: 53.2, y: 13.3, ang: -Math.PI / 2, anim: t < kick ? 'windup' : 'shoot', frame: 45, light: [1.2, 1.05, 1.15] });
          if (t < kick) K.ball(53.38, 13.1, 0.06);
          else {
            const q = (t - kick) / 30;
            K.ball(lerp(53.38, 51.8, q), lerp(13.1, 11.2, q), 0.06 + q * 1.4);
          }
          const sh = t >= kick ? (1 - seg(t, kick, kick + 24)) * 0.03 : 0.004;
          K.cam([54.4 + K.noise(S.f * 2, 1) * sh, 0.2, 12.55], [53.25, 0.3, 13.2], 46);
        } else if (t < 160) {
          // a linha que só ele viu: de trás do Sae, a bola voando até você lá longe
          const u = t - 72;
          A(K, 'sae', { x: 53.2, y: 13.3, ang: -Math.PI / 2 - 0.5, anim: 'shoot', frame: 45, light: [1.0, 0.85, 0.95] });
          A(K, 'you', { x: lerp(50.2, 50.3, u / 88), y: lerp(10.2, 9.9, u / 88), ang: -Math.PI / 2, anim: 'run', frame: f, light: [1.1, 1.25, 1.25] });
          A(K, 'rin', { x: 55.9, y: lerp(10.2, 9.6, u / 88), ang: -Math.PI / 2, anim: 'run', frame: f + 1 });
          A(K, 'hugo', { x: 55.6, y: lerp(10.6, 10.0, u / 88), ang: -Math.PI / 2, anim: 'run', frame: f + 3 });
          A(K, 'kaiser', { x: 53.2, y: 11.9, face: [53.2, 13.3], anim: 'run', frame: f + 2 });
          A(K, 'lorenzo', { x: 52.4, y: 12.8, face: [53.2, 13.3], anim: 'run', frame: f + 4 });
          A(K, 'charles', { x: 54.0, y: 12.8, face: [53.2, 13.3], anim: 'run', frame: f + 5 });
          const bk = seg(u, 26, 88);
          if (bk > 0) {
            const p = qb3([53.38, 0.08, 13.1], [51.9, 2.4, 11.4], [50.3, 0.6, 9.75], easeIO(bk) * 0.9);
            K.ball(p[0], p[2], p[1], { light: [1.3, 1.1, 1.2] });
          }
          K.cam([53.75 + u * 0.002, 1.35, 14.6], [51.6, 0.6, 10.6], 50);
        } else if (t < 184) {
          // o colégio (memória): você de costas com a bola, o Tada lá na frente pedindo
          K.sky('#312e81', '#fb923c', 0);
          K.fog('#7c3a1c', 0.02);
          K.ambient('#f0b080');
          K.floor({ x0: 70, y0: 0, x1: 100, y1: 30, color: '#4d7c0f' });
          pic(K, { x: 86, y: 5, z: -0.5, w: 30, h: 9.4, ang: Math.PI / 2, img: schoolCv(), color: '#ffffff', light: [0.95, 0.75, 0.6] });
          miniGoal(K, 86, 9.0, 2.4, 0.9, 'x', '#f8fafc');
          K.actor('tada', { x: 87.3, y: 11.6, ang: Math.PI / 2, extra: KIT_SCHOOL, anim: 'call_pass', frame: 45, k: 0.9 });
          K.actor('you', { x: 85.8, y: 15.0, ang: -Math.PI / 2, extra: KIT_SCHOOL, frame: 45, k: 0.9, light: [1.05, 0.85, 0.7] });
          K.ball(86.1, 14.8, 0.06);
          K.cam([85.6 - (t - 160) * 0.004, 0.62, 16.7], [86.4, 0.62, 12.0], 46);
        } else {
          // agora: atrás de você correndo; a bola passa por cima da câmera e cai à sua frente
          const v = t - 184;
          const yy = lerp(10.5, 9.9, v / 78);
          A(K, 'you', { x: YX, y: yy, ang: -Math.PI / 2, anim: 'run', frame: f, light: [1.05, 1.2, 1.2] });
          A(K, 'loki', { x: lerp(52.9, 52.4, v / 78), y: yy - 1.7, face: [YX, yy], anim: 'run', frame: f + 2 });
          A(K, 'hugo', { x: 54.6, y: yy - 1.3, ang: -Math.PI / 2, anim: 'run', frame: f + 4 });
          A(K, 'rin', { x: 55.1, y: yy - 1.5, ang: -Math.PI / 2, anim: 'run', frame: f + 1 });
          const q = seg(v, 0, 70);
          const p = qb3([YX + 0.3, 1.6, yy + 1.9], [YX + 0.3, 1.5, yy + 0.4], [YX + 0.2, 0.6, yy - 0.9], q);
          K.ball(p[0], p[2], p[1], { light: [1.3, 1.1, 1.2] });
          K.cam([YX - 0.1, 0.55, yy + 1.35], [YX + 0.2, 0.55, yy - 2], 50);
        }
      } else if (phase === 4) {
        // a Velocidade Divina: o Loki surge do fundo e encosta em você
        const kk = easeIn(seg(t, 8, 128));
        const yy = lerp(10.6, 9.8, t / 190);
        A(K, 'you', { x: YX, y: yy, ang: -Math.PI / 2, anim: 'run', frame: f, light: [1.05, 1.2, 1.2] });
        A(K, 'loki', { x: lerp(55.5, YX + 0.75, kk), y: lerp(14.5, yy + 0.25, kk), face: [YX, yy - 2], anim: 'run', frame: S.f, light: [1.25, 1.15, 0.8] });
        const bq = seg(t, 0, 190);
        K.ball(YX + 0.2, yy - 0.6, lerp(1.25, 0.85, bq), { light: [1.3, 1.1, 1.2] });
        const sh = K.noise(S.f * 1.7, 4) * (0.008 + kk * 0.02);
        K.cam([YX + 0.15 + sh, 0.52, yy - 2.3], [YX + 0.3, 0.72, yy + 0.4], 46);
      } else if (phase === 5) {
        // metavisão: o que você vê (o goleiro, a bola parada no ar, o ângulo)
        A(K, 'gk', { x: 53.2, y: 7.0, face: [50.6, 9.6], frame: 45 });
        K.ball(YX + 0.35, 9.3, 0.95 - t * 0.0012, { light: [1.3, 1.1, 1.2] });
        K.cam([YX - 0.15, 0.78, 10.05], [52.9, 0.75, 6.8], 46);
      } else if (phase === 6) {
        // de primeira: atrás de você; o Loki chega de carrinho um instante tarde
        const kick = 60;
        const hold = 12;
        const tt = t < kick ? t : t < kick + hold ? kick : t - hold;
        const after = Math.max(0, tt - kick);
        const st = tt < kick - 26 ? 'run' : tt < kick ? 'windup' : 'shoot';
        A(K, 'you', { x: YX, y: 9.7, ang: -Math.PI / 2 + 0.5, anim: st, frame: st === 'run' ? f : 45, light: [1.05, 1.2, 1.2] });
        const lx = lerp(55.6, 51.0, ease(seg(tt, 24, 90))) - Math.max(0, tt - 90) * 0.004;
        A(K, 'loki', { x: lx, y: 9.55, ang: Math.PI, anim: 'slide', frame: 45, light: [1.2, 1.1, 0.8] });
        const d = ease(seg(after, 4, 30));
        A(K, 'gk', { x: lerp(53.1, 53.65, d), y: 7.0, z: Math.sin(d * Math.PI * 0.7) * 0.35, face: [50, 9.7], anim: after > 4 ? 'dive' : 'idle', frame: 45 });
        const foot = [YX + 0.3, 0.08, 9.45];
        if (tt < kick) {
          const q = tt / kick;
          K.ball(lerp(51.4, foot[0], q), lerp(8.4, foot[2], q), lerp(2.4, foot[1], easeIn(q)));
        } else {
          const q = seg(after, 0, 24);
          const p = qb3(foot, [52.4, 1.6, 8.0], [ANGLE[0], ANGLE[1], ANGLE[2]], 1 - Math.pow(1 - q, 1.5));
          K.ball(p[0], p[2], q >= 1 ? Math.max(0.1, ANGLE[1] - (after - 24) * 0.02) : p[1], { light: [1.3, 1.2, 1.2] });
        }
        const sh = t >= kick ? Math.max(0, 1 - (t - kick) / 30) * 0.04 : 0.005;
        const pan = t >= kick ? easeIO(seg(t, kick + hold, kick + 60)) * 0.35 : 0;
        K.cam([YX - 0.35 + K.noise(S.f * 2.2, 5) * sh, 0.55, 11.25], [YX + 1.2 + pan, 0.7, 6.9], t < kick ? 46 - seg(t, 0, kick) * 4 : 42);
      } else if (phase === 7) {
        // de frente pro gol: a bola entra no ângulo, o goleiro voa e não chega
        const hit = 40;
        const gd = ease(seg(t, 6, 46));
        const fall = seg(t, 52, 84);
        const gz = t < 52 ? Math.sin(gd * Math.PI * 0.6) * 0.16 : lerp(0.16 * Math.sin(Math.PI * 0.6), 0, easeIn(fall));
        A(K, 'gk', { x: lerp(53.05, 53.6, gd), y: 7.0, z: gz, face: [53, 10], anim: t < 6 ? 'idle' : 'dive', frame: 45, light: [1.0, 1.1, 1.0] });
        if (t < hit) {
          const q = 1 - Math.pow(1 - t / hit, 1.6);
          K.ball(lerp(52.7, ANGLE[0], q), lerp(10.6, ANGLE[2], q), lerp(0.5, ANGLE[1], q) + Math.sin(q * Math.PI) * 0.25, { k: 0.8, light: [1.3, 1.2, 1.2] });
        } else if (t < hit + 70) K.ball(ANGLE[0], ANGLE[2] - 0.25, Math.max(0.08, ANGLE[1] - (t - hit) * 0.03));
        const sh = t >= hit ? Math.max(0, 1 - (t - hit) / 30) * 0.035 : 0.004;
        K.cam([52.75 + K.noise(S.f * 2, 2) * sh, 0.5, 10.4], [53.3, 0.62, 6.6], lerp(44, 41, seg(t, hit, 190)));
      } else if (phase === 8) {
        // o apito final: a Catedral explode; você de costas, de braço erguido
        const kk = easeIO(t / 200);
        const jump = Math.abs(Math.sin(t * 0.09)) * 0.1;
        A(K, 'you', { x: 53, y: 12.4, z: jump, ang: -Math.PI / 2, anim: 'call_pass', frame: 45, light: [1.1, 1.25, 1.25] });
        A(K, 'rin', { x: 54.4, y: 11.3, face: [53, 12.4], frame: 45, light: [0.6, 0.75, 0.8] });
        A(K, 'sae', { x: lerp(55.4, 56.0, kk), y: lerp(10.8, 10.3, kk), ang: -Math.PI / 2 + 0.4, anim: 'run', frame: Math.floor(S.f / 8) });
        A(K, 'gaga', { x: lerp(48.4, 51.6, ease(t / 200)), y: 12.9, face: [53, 12.4], anim: 'run', frame: f });
        A(K, 'shidou', { x: lerp(48.9, 52.1, ease(t / 200)), y: 13.5, face: [53, 12.4], anim: 'run', frame: f + 2 });
        const sh = t < 24 ? K.noise(S.f * 2, 3) * 0.03 * (1 - t / 24) : 0;
        K.cam([53 + sh, 0.6, 15.3 - kk * 0.2], [53, 1.55, 7.5], 52);
      } else {
        // os quatro egos (e você): um close pra cada um
        const order = [[0, 'sae', SAE_C], [100, 'rin', RIN_C], [188, 'loki', LOKI_C], [240, 'hugo', HUGO_C], [272, 'you', YOU_C]];
        let cur = order[0];
        order.forEach((o) => {
          if (t >= o[0]) cur = o;
        });
        const lt = t - cur[0];
        const lights = { sae: [1.2, 1.0, 1.1], rin: [0.85, 1.1, 1.15], loki: [1.15, 1.05, 0.75], hugo: [1.1, 0.8, 0.85], you: [1.0, 1.2, 1.2] };
        A(K, cur[1], { x: 53, y: 12.0, ang: Math.PI / 2, frame: 45, light: lights[cur[1]] });
        const side = cur[1] === 'rin' || cur[1] === 'hugo' ? 1 : -1;
        K.cam([53 + side * (0.25 - lt * 0.0008), 0.66, 13.72 - lt * 0.0006], [53, 0.6, 12.0], 32);
      }
    },
    overlay(ctx, S, K) {
      camBack();
      const { W, H, t, phase, top, bot } = S;
      const c = this.wcfgCast();
      const me = this.cinePlayerName();
      if (phase === 0) {
        const kk = easeIO(seg(t, 0, 196));
        for (let i = 0; i < 26; i++) {
          const per = 60 + rnd(i, 3) * 70;
          const ph = (t + rnd(i, 4) * per) % per;
          if (ph >= 7) continue;
          this.finSparkle(ctx, rnd(i, 5) * W, top + rnd(i, 6) * (bot - top) * 0.45, 6 + rnd(i, 7) * 5, 1 - ph / 7);
        }
        shade(ctx, S, top, top + 150, 0.7, 0);
        const tagOut = 1 - seg(t, 140, 152);
        TAGS.forEach(([w, nm, col, at]) => {
          const [x, y] = w === 'sae' || w === 'loki' ? P1POS[w][0] : p1At(w, kk);
          const p = scr(K, x, 0.98, y);
          if (p) this.wcfgTag(ctx, p.x, p.y, nm || me, col, seg(t, at, at + 14) * tagOut);
        });
        const dk = seg(t, 146, 164);
        if (dk > 0) {
          ctx.fillStyle = `rgba(1,3,11,${0.62 * dk})`;
          ctx.fillRect(0, top, W, bot - top);
          this.rincStamp(ctx, 'QUATRO EGOS.', W / 2, top + 210, 104, '#f8fafc', t, 152, 2, W * 0.8);
          const names = [[me, YOU_C], ['SAE', SAE_C], ['LOKI', LOKI_C], ['HUGO', HUGO_C]];
          ctx.save();
          ctx.font = 'italic 900 26px "Segoe UI", sans-serif';
          const ws = names.map(([n]) => ctx.measureText(n).width);
          ctx.restore();
          let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + 46 * 3) / 2;
          names.forEach(([n, col], i) => {
            this.cineImpactText(ctx, n, x + ws[i] / 2, top + 300, 26, col, seg(t, 170 + i * 6, 178 + i * 6));
            x += ws[i] + 46;
          });
        }
        this.wcfgScore(ctx, W - 414, top + 18, 2, "90+5'", seg(t, 8, 24));
        this.finKicker(ctx, 40, top + 30, 'CATEDRAL MUNDIAL • FINAL DA COPA SUB-20', seg(t, 10, 60));
        this.finKicker(ctx, 40, top + 58, "90+5' • O ÚLTIMO ATAQUE", seg(t, 40, 90), '#facc15');
        this.cineFlash(ctx, W, H, 1 - seg(t, 14, 32), '#000000');
        this.cineSfx(S, 2, 'torcida', () => window.SFX?.whistle?.(1));
        this.cineSfx(S, 152, 'egos', () => window.SFX?.kick?.(0.6));
      } else if (phase === 1) {
        this.cineBokeh(ctx, W, top, top + 200, t * 0.5, 14, ['rgba(0,245,212,0.28)', 'rgba(250,204,21,0.26)', 'rgba(249,168,212,0.3)'], 21);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.cineGradient(ctx, 0, top, W, bot - top, [[0, 'rgba(80,20,50,0.18)'], [1, 'rgba(80,20,50,0)']]);
        ctx.restore();
        const ps = scr(K, 53.2, 1.0, 13.3);
        if (ps) this.ptdRings(ctx, ps.x, ps.y, seg(t, 124, 164), ['#f9a8d4', '#fdf2f8'], 240, 0);
        if (t < 96) this.ptdChip(ctx, 'TRÊS EM CIMA DELE', W - 220, top + 44, '#ef4444', seg(t, 12, 26) * (1 - seg(t, 84, 96)));
        // painel: um olho do Sae, de perto (pálpebra a meio mastro... até ele ver)
        const kp = ease(seg(t, 62, 80));
        if (kp > 0) {
          const pts = [[22, top + 22], [420, top + 22], [388, bot - 22], [22, bot - 22]];
          this.cinePanel(ctx, pts, () => {
            this.wcfgPanelBg(ctx, 0, top, 440, bot - top, '#1a0715', '#3b0a2a', '#f9a8d4', 210, top + 270, t * 0.002);
            const dw = 380;
            const U = dw / 6;
            const x0 = 210 - dw / 2;
            const y0 = top + 270 - 3.1 * U;
            this.finCrop(ctx, c.sae, {}, 11.5, 7, 6, 6, x0, y0, dw, U * 6);
            const ex = x0 + (14.5 - 11.5) * U;
            const ey = y0 + 3.1 * U;
            const saw = t >= 120;
            if (!this.cineSpriteEyes(ctx, c.sae, x0 + 6.5 * U, ey, U, { side: -1 })) this.drawPixelEye(ctx, ex, ey, U * 0.3, { line: '#020617', iris: '#0f766e', ring: '#5eead4', look: saw ? 2 : 0, tiny: false });
            if (!saw) this.finLid(ctx, ex, ey, U * 0.3, 1, 'half', this.finShade(c.sae.skinColor, -0.18));
            ctx.fillStyle = 'rgba(40,8,30,0.22)';
            ctx.fillRect(0, top, 440, bot - top);
            if (saw) this.ptdEyeFlare(ctx, ex + U * 0.6, ey, seg(t, 120, 134) * (1 - seg(t, 150, 186) * 0.6), '#f9a8d4', 900);
          }, { dx: (1 - kp) * -460 });
        }
        this.finKicker(ctx, 40, top + 30, 'SAE ITOSHI • O PRODÍGIO', seg(t, 6, 44) * (1 - seg(t, 56, 64)), SAE_C);
        this.cineSfx(S, 120, 'viu', () => window.SFX?.blip?.(880));
      } else if (phase === 2) {
        this.ptdRays(ctx, W / 2, top + 260, 900, '#e0f2fe', 0.06, t * 0.002, 44, 0.03);
        // painel: o grito (boca aberta, dentes)
        const kp = ease(seg(t, 8, 22)) * (1 - ease(seg(t, 104, 116)));
        if (kp > 0) {
          const pts = [[W * 0.6, top + 18], [W - 22, top + 18], [W - 22, top + 206], [W * 0.585, top + 222]];
          this.cinePanel(ctx, pts, () => {
            this.wcfgPanelBg(ctx, W * 0.55, top, W * 0.45, 240, '#021a1d', '#04343a', '#2dd4bf', W * 0.8, top + 120, t * 0.003);
            const cw = 520;
            const U = cw / 14;
            const x0 = W * 0.8 - cw / 2;
            const y0 = top + 30 - 1.5 * U;
            const cu0 = 11;
            const cv0 = 7;
            this.finCrop(ctx, c.rin, {}, cu0, cv0, 14, 8, x0, y0, cw, U * 8);
            const ey = y0 + (10.1 - cv0) * U;
            const real = this.cineSpriteEyes(ctx, c.rin, x0 + (18 - cu0) * U, ey, U, { expr: 'angry' });
            [14.5, 21.5].forEach((ux, i) => {
              const ex = x0 + (ux - cu0) * U;
              if (!real) this.drawPixelEye(ctx, ex, ey, U * 0.3, { line: '#020617', iris: '#0f766e', ring: RIN_C, look: i ? -1 : 1 });
              if (!real) this.finLid(ctx, ex, ey, U * 0.3, i === 0 ? 1 : -1, 'angry', '#020617');
            });
            const fu = (ux, uy, uw, uh, col) => {
              ctx.fillStyle = col;
              ctx.fillRect(Math.round(x0 + (ux - cu0) * U), Math.round(y0 + (uy - cv0) * U), Math.ceil(uw * U), Math.ceil(uh * U));
            };
            fu(16.2, 12.1, 3.6, 2.0, '#1f0606');
            fu(16.4, 12.1, 3.2, 0.45, '#f1f5f9');
            fu(16.6, 13.6, 2.8, 0.4, '#f1f5f9');
            ctx.fillStyle = 'rgba(2,26,29,0.2)';
            ctx.fillRect(W * 0.55, top, W * 0.45, 240);
          }, { dx: (1 - kp) * 560 });
          this.rincStamp(ctx, 'SAE!!', W * 0.585 - 24, top + 64, 66, RIN_C, t, 20, 3, 0, 'right', clamp(kp * 2));
        }
        const kh = ease(seg(t, 112, 128));
        if (kh > 0) {
          const pts = [[22, top + 18], [W * 0.4, top + 18], [W * 0.385, top + 196], [22, top + 210]];
          this.cinePanel(ctx, pts, () => {
            this.wcfgPanelBg(ctx, 0, top, W * 0.45, 230, '#1c0510', '#3f0a1c', '#fb7185', W * 0.2, top + 110, t * 0.003);
            const dw = 520;
            const U = dw / 14;
            this.wcfgBand(ctx, c.hugo, W * 0.205 - dw / 2, top + 118 - 3.1 * U, dw, { ring: '#fda4af', iris: '#3f0a1c', look: -2, half: true });
            ctx.fillStyle = 'rgba(40,4,16,0.22)';
            ctx.fillRect(0, top, W * 0.45, 230);
          }, { dx: (1 - kh) * -620 });
          this.finKicker(ctx, 46, top + 186, 'HUGO', seg(t, 124, 140), HUGO_C);
        }
        if (t > 150) this.ptdChip(ctx, 'HUGO MORDEU A ISCA', W - 200, bot - 60, HUGO_C, seg(t, 150, 164));
        this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI • POR PURO EGO', seg(t, 4, 44) * (1 - seg(t, 100, 112)), RIN_C);
        this.cineSfx(S, 20, 'grito', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        const kick = 34;
        if (t < 72) {
          if (t >= kick) {
            const p0 = scr(K, 53.38, 0.08, 13.1);
            if (p0) {
              if (t < kick + 10) this.drawRadialSpeedLines(ctx, p0.x, p0.y, W, '#020617', 0.5 * (1 - (t - kick) / 10));
              this.ptdRings(ctx, p0.x, p0.y, seg(t, kick, kick + 26), ['#f9a8d4', '#ffffff', '#f9a8d4'], 260, -0.4);
            }
            this.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, kick, kick + 9)), '#fdf2f8');
            this.cineImpactText(ctx, 'TRIVELA!', W * 0.74, top + 110, 96, SAE_C, seg(t, kick + 2, kick + 10), W * 0.5, -0.1);
          }
          this.cineSfx(S, kick, 'passe', () => window.SFX?.kick?.(0.8));
        } else if (t < 160) {
          const u = t - 72;
          // o mundo em retícula; só a linha e você em cor
          ctx.fillStyle = 'rgba(6,10,24,0.36)';
          ctx.fillRect(0, top, W, bot - top);
          this.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.3);
          const yx = lerp(50.2, 50.3, u / 88);
          const yy = lerp(10.2, 9.9, u / 88);
          const py = scr(K, yx, 0.02, yy);
          if (py) {
            this.cineGlow(ctx, py.x, py.y - 40, 90, 'rgba(0,245,212,0.5)', 1);
            ctx.strokeStyle = `rgba(0,245,212,${0.6 + 0.4 * Math.sin(t * 0.2)})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(py.x, py.y, 40, 10, 0, 0, TAU);
            ctx.stroke();
          }
          const lk = ease(seg(u, 2, 40));
          strokePts(ctx, curve2d(K, [53.38, 0.08, 13.1], [51.9, 2.4, 11.4], [50.3, 0.6, 9.75], 0, lk), [['rgba(249,168,212,0.25)', 18], [SAE_C, 6], ['#ffffff', 2]]);
          this.finKicker(ctx, 40, top + 30, 'A LINHA QUE SÓ O SAE VIU', seg(u, 6, 46), SAE_C);
          this.cineSfx(S, 74, 'linha', () => window.SFX?.whoosh?.());
        } else if (t < 184) {
          ctx.fillStyle = 'rgba(234,88,12,0.2)';
          ctx.fillRect(0, top, W, bot - top);
          this.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.25);
          const pt = scr(K, 87.3, 1.05, 11.6);
          if (pt) this.rincStamp(ctx, 'PASSA!', pt.x + 60, pt.y - 20, 34, '#fed7aa', t - 160, 2, 2);
          this.finKicker(ctx, 46, top + 44, 'COLÉGIO ICHINAN • A FINAL REGIONAL', seg(t, 162, 182), '#fb923c');
          this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, 160, 168)), '#fed7aa');
        } else {
          this.finKicker(ctx, W - 46, bot - 40, 'AGORA • A CATEDRAL', seg(t, 190, 226), YOU_C, 'right');
          this.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, 184, 192)), '#ffffff');
        }
      } else if (phase === 4) {
        const kk = easeIn(seg(t, 8, 128));
        const yy = lerp(10.6, 9.8, t / 190);
        const lx = lerp(55.5, YX + 0.75, kk);
        const ly = lerp(14.5, yy + 0.25, kk);
        const pl = scr(K, lx, 0.5, ly);
        const ph = scr(K, lx, 0.8, ly);
        this.ptdRays(ctx, W / 2, top + 220, 1000, '#fde68a', 0.05 + kk * 0.08, t * 0.003, 44, 0.03);
        if (pl) {
          const ls = Math.abs((scr(K, lx, 0, ly)?.y ?? pl.y) - (ph?.y ?? pl.y)) * 2.6 + 40;
          // o rastro dourado vai para onde ele estava (lá atrás)
          const kb = Math.max(0, kk - 0.35);
          const pb = scr(K, lerp(55.5, YX + 0.75, kb), 0.5, lerp(14.5, yy + 0.25, kb)) || { x: pl.x - 300, y: pl.y - 60 };
          for (let i = 0; i < 4; i++) {
            const sd = Math.floor(t / 3) * 7 + i * 13;
            const o = (i - 1.5) * ls * 0.22;
            this.wcfgBolt(ctx, pl.x, pl.y + o, pb.x, pb.y + o * 0.5, sd, 16 + i * 4, LOKI_C, 5 - i);
          }
          this.cineGlow(ctx, pl.x, pl.y, ls * 0.7, 'rgba(250,204,21,0.35)', 0.9);
          ctx.fillStyle = 'rgba(253,230,138,0.85)';
          for (let i = 0; i < 14; i++) {
            const q = ((t * 3 + i * 11) % 30) / 30;
            ctx.fillRect(pl.x - ls * 0.3 + rnd(i, 3) * ls * 0.6 + q * 120, pl.y + ls * 0.35 - Math.sin(q * Math.PI) * 40 * rnd(i, 4), 4, 4);
          }
        }
        if (t > 140 && ph) {
          const e = seg(t, 140, 152);
          this.ptdEyeFlare(ctx, ph.x, ph.y, e * (1 - seg(t, 170, 190)), '#facc15', W * 0.6);
        }
        this.cineImpactText(ctx, 'VELOCIDADE DIVINA', W * 0.33, top + 58, 54, LOKI_C, seg(t, 30, 42), W * 0.56, -0.05);
        this.finKicker(ctx, 50, top + 112, 'GODSPEED • JULIAN LOKI', seg(t, 46, 80), LOKI_C);
        this.cineSfx(S, 10, 'vento', () => window.SFX?.whoosh?.());
        this.cineSfx(S, 120, 'vento2', () => window.SFX?.whoosh?.());
      } else if (phase === 5) {
        // o caminho até o ângulo (pontilhado andando) e a mira travando
        const b = [YX + 0.35, 0.95 - t * 0.0012, 9.3];
        const pk = ease(seg(t, 46, 96));
        strokePts(ctx, curve2d(K, b, [52.4, 2.0, 7.9], ANGLE, 0, pk), [['rgba(0,245,212,0.25)', 10], [YOU_C, 3, [[10, 9], -t * 0.8]]]);
        const tg = scr(K, ANGLE[0], ANGLE[1], ANGLE[2]);
        const lock = ease(seg(t, 80, 116));
        if (pk > 0.6 && tg) {
          const rs = lerp(70, 20, lock);
          ctx.save();
          ctx.strokeStyle = lock >= 1 ? YOU_C : '#f8fafc';
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            const x = tg.x + sx * rs;
            const y = tg.y + sy * rs;
            ctx.moveTo(x, y - sy * 12);
            ctx.lineTo(x, y);
            ctx.lineTo(x - sx * 12, y);
          });
          ctx.stroke();
          ctx.restore();
          if (lock >= 1) {
            this.cineGlow(ctx, tg.x, tg.y, 60, 'rgba(0,245,212,0.6)', 0.6 + 0.3 * Math.sin(t * 0.3));
            this.ptdChip(ctx, 'O ÂNGULO', tg.x - 100, tg.y + 60, YOU_C, seg(t, 116, 128), { size: 14 });
          }
        }
        const pb = scr(K, b[0], b[1], b[2]);
        if (pb) this.cineGlow(ctx, pb.x, pb.y, 70, 'rgba(249,168,212,0.45)', 1);
        this.finKicker(ctx, 34, top + 212, 'METAVISÃO', seg(t, 30, 60), YOU_C);
        // faixas: os seus olhos em cima, os do Loki embaixo
        const b1 = [top + 12, top + 150];
        const k1 = ease(seg(t, 0, 14));
        this.cinePanel(ctx, [[18, b1[0]], [W - 18, b1[0]], [W - 18, b1[1] - 8], [18, b1[1]]], () => {
          this.wcfgPanelBg(ctx, 0, b1[0], W, 150, '#021016', '#03262b', null);
          const dw = 680 + easeIO(t / 170) * 40;
          const U = dw / 14;
          const e = this.wcfgBand(ctx, c.you, W / 2 - dw / 2, (b1[0] + b1[1]) / 2 - 3.1 * U, dw, { ring: YOU_C, iris: '#064e3b', look: 1 });
          const gl = ease(seg(t, 16, 50));
          this.luckStreak(ctx, e.rx + 2.4 * U + gl * 520, e.ly - 0.3 * U, e.rx + 2.2 * U, e.ly, 2, 12, '0,245,212', 0.9);
          this.luckStreak(ctx, e.lx - 2.4 * U - gl * 520, e.ly - 0.3 * U, e.lx - 2.2 * U, e.ly, 2, 12, '0,245,212', 0.9);
          ctx.fillStyle = 'rgba(0,30,40,0.18)';
          ctx.fillRect(0, b1[0], W, 150);
        }, { dx: (1 - k1) * -W });
        const b3 = [bot - 150, bot - 12];
        const k3 = ease(seg(t, 36, 50));
        this.cinePanel(ctx, [[18, b3[0]], [W - 18, b3[0] + 8], [W - 18, b3[1]], [18, b3[1]]], () => {
          this.wcfgPanelBg(ctx, 0, b3[0], W, 150, '#140f02', '#3f2e06', null);
          const dw = 680;
          const U = dw / 14;
          const late = t > 122;
          const e = this.wcfgBand(ctx, c.loki, W / 2 - dw / 2, (b3[0] + b3[1]) / 2 - 3.1 * U, dw, { ring: '#f0b429', iris: '#3b2a05', look: late ? 0 : -1, tiny: late });
          this.cineGlow(ctx, e.rx, e.ly, 70, 'rgba(250,204,21,0.4)', 0.8);
          this.wcfgSweat(ctx, e.rx + 2.6 * U, e.ly - 1.6 * U, U, seg(t, 126, 166));
          ctx.fillStyle = 'rgba(30,20,0,0.2)';
          ctx.fillRect(0, b3[0], W, 150);
        }, { dx: (1 - k3) * -W });
        [60, 100, 140].forEach((a, i) => this.cineSfx(S, a, 'tic' + i, () => window.SFX?.blip?.(330 - i * 30)));
      } else if (phase === 6) {
        const kick = 60;
        const hold = 12;
        const tt = t < kick ? t : t < kick + hold ? kick : t - hold;
        const after = Math.max(0, tt - kick);
        const foot = [YX + 0.3, 0.08, 9.45];
        const pf = scr(K, foot[0], foot[1], foot[2]);
        const tg = scr(K, ANGLE[0], ANGLE[1], ANGLE[2]);
        if (t < kick && tg) {
          const lk = ease(seg(t, 10, 50));
          const rs = lerp(40, 14, lk);
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.5 * lk;
          ctx.strokeStyle = YOU_C;
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            ctx.moveTo(tg.x + sx * rs, tg.y + sy * rs - sy * 8);
            ctx.lineTo(tg.x + sx * rs, tg.y + sy * rs);
            ctx.lineTo(tg.x + sx * rs - sx * 8, tg.y + sy * rs);
          });
          ctx.stroke();
          ctx.restore();
          this.finKicker(ctx, 40, top + 30, 'SEM DOMINAR • DE PRIMEIRA', seg(t, 10, 50), YOU_C);
        }
        // o rastro dourado do carrinho do Loki
        const lx = lerp(55.6, 51.0, ease(seg(tt, 24, 90)));
        const plk = scr(K, lx, 0.25, 9.55);
        if (plk && tt < 110) for (let i = 0; i < 3; i++) this.wcfgBolt(ctx, plk.x + 60, plk.y - 20 - i * 30, plk.x + 360 + i * 40, plk.y - 40 - i * 24, Math.floor(t / 3) * 5 + i * 9, 14, LOKI_C, 4 - i);
        if (tt >= kick) {
          const q = seg(after, 0, 24);
          if (q < 1) {
            const pts = [];
            for (let i = 0; i < 9; i++) {
              const qq = 1 - Math.pow(1 - Math.max(0, q - i * 0.05), 1.5);
              const p = qb3(foot, [52.4, 1.6, 8.0], ANGLE, qq);
              const s = scr(K, p[0], p[1], p[2]);
              if (s) pts.push({ x: s.x, y: s.y });
            }
            if (pts.length > 1) this.ptdStreak(ctx, pts, YOU_C, 30, 0.85);
          } else if (tg) this.ptdRings(ctx, tg.x, tg.y, seg(after, 24, 44), [YOU_C, '#ffffff'], 90, 0);
          if (pf) this.ptdRings(ctx, pf.x, pf.y, seg(after, 0, 30), [YOU_C, '#ffffff', YOU_C], 260, -0.2);
        }
        if (t >= kick && t < kick + hold) {
          // quadro de impacto: tudo invertido, a bola em branco, a mira
          ctx.save();
          ctx.globalCompositeOperation = 'difference';
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
          if (pf) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pf.x, pf.y - 10, 30, 0, TAU);
            ctx.fill();
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#0a1430';
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.strokeStyle = YOU_C;
            ctx.beginPath();
            ctx.arc(pf.x, pf.y - 10, 44 + (t - kick) * 5, 0, TAU);
            ctx.stroke();
          }
          if (tg) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = YOU_C;
            ctx.strokeRect(tg.x - 16, tg.y - 16, 32, 32);
          }
          this.cineImpactText(ctx, 'BAM!!', W * 0.26, top + 120, 150, '#f8fafc', seg(t, kick, kick + 6), W * 0.44, -0.1);
          this.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
        }
        if (t >= kick + hold && t < kick + hold + 10 && pf) this.drawRadialSpeedLines(ctx, pf.x, pf.y, W, '#020617', 0.5 * (1 - (t - kick - hold) / 10));
        if (t >= kick + hold) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, kick + hold, kick + hold + 8)));
        if (t > 104) this.cineImpactText(ctx, 'UM INSTANTE TARDE!', W * 0.3, top + 84, 48, LOKI_C, seg(t, 104, 114), W * 0.52, -0.05);
      } else if (phase === 7) {
        const hit = 40;
        [[200, top + 30, 52], [1080, top + 20, 64], [640, top + 10, 80], [380, top + 40, 96], [940, top + 50, 112], [120, top + 60, 130]].forEach(([x, y, at], i) =>
          this.luckFirework(ctx, x, y, t - at, ['#facc15', YOU_C, '#f8fafc', '#ef4444'][i % 4], 24, 110 + (i % 3) * 30)
        );
        const tg = scr(K, ANGLE[0], ANGLE[1], ANGLE[2]);
        if (t < hit) {
          const pts = [];
          for (let i = 0; i < 7; i++) {
            const q = 1 - Math.pow(1 - Math.max(0, t / hit - i * 0.05), 1.6);
            const s = scr(K, lerp(52.7, ANGLE[0], q), lerp(0.5, ANGLE[1], q) + Math.sin(q * Math.PI) * 0.25, lerp(10.6, ANGLE[2], q));
            if (s) pts.push({ x: s.x, y: s.y });
          }
          if (pts.length > 1) this.ptdStreak(ctx, pts, YOU_C, 40, 0.6);
        }
        if (tg && t >= hit && t < hit + 30) this.ptdRings(ctx, tg.x, tg.y, seg(t, hit, hit + 30), [YOU_C, '#facc15', '#ffffff'], 320, 0);
        if (t > hit + 26) this.drawConfetti(ctx, W, H, t - hit, 60);
        this.cineFlash(ctx, W, H, t >= hit ? 0.7 * (1 - seg(t, hit, hit + 9)) : 0);
        if (t >= hit + 6) {
          this.cineGradient(ctx, 0, bot - 190, W, 190, [[0, 'rgba(1,3,11,0)'], [1, 'rgba(1,3,11,0.6)']]);
          this.rincStamp(ctx, 'GOOOOOOL!!', W / 2, bot - 100, 120, '#facc15', t, hit + 6, 3, W * 0.86);
          this.finKicker(ctx, W / 2, bot - 30, 'NO ÂNGULO • DE PRIMEIRA', seg(t, hit + 40, hit + 80), YOU_C, 'center');
        }
        const flipped = t >= 66;
        this.wcfgScore(ctx, 28, top + 18, flipped ? 3 : 2, "90+5'", 1, flipped ? seg(t, 66, 86) : 0);
        this.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
        this.cineSfx(S, 12, 'mergulho', () => window.SFX?.whoosh?.());
      } else if (phase === 8) {
        const fw = [[200, 150, 2], [1000, 120, 14], [600, 90, 26], [400, 210, 40], [1130, 230, 54], [800, 170, 68], [130, 260, 82], [700, 110, 96], [470, 140, 112], [1070, 150, 128], [280, 120, 144], [900, 220, 160]];
        fw.forEach(([x, y, at], i) => this.luckFirework(ctx, x, top + y - 60, t - at, ['#facc15', YOU_C, '#f8fafc', '#ef4444', '#60a5fa'][i % 5], 26, 120 + (i % 3) * 30));
        for (let i = 0; i < 30; i++) {
          const per = 40 + rnd(i, 13) * 50;
          const ph = (t + rnd(i, 14) * per) % per;
          if (ph >= 6) continue;
          this.finSparkle(ctx, rnd(i, 15) * W, top + 120 + rnd(i, 16) * 200, 7 + rnd(i, 17) * 5, 1 - ph / 6);
        }
        this.cineShafts(ctx, 160, top - 30, 1.0 + Math.sin(t * 0.03) * 0.3, 760, 0.18, 2, '191,219,254', 0.08, t);
        this.cineShafts(ctx, 1120, top - 30, 2.1 + Math.sin(t * 0.03 + 1) * 0.3, 760, 0.18, 2, '191,219,254', 0.08, t);
        const py = scr(K, 53, 0.5, 12.4);
        if (py) this.cineGlow(ctx, py.x, py.y, 230, 'rgba(0,245,212,0.3)', 1);
        this.drawConfetti(ctx, W, H, t + 200, 90);
        const dk = seg(t, 30, 50);
        if (dk > 0) this.cineGradient(ctx, 0, top, W, 230, [[0, `rgba(1,3,11,${0.85 * dk})`], [0.75, `rgba(1,3,11,${0.4 * dk})`], [1, 'rgba(1,3,11,0)']]);
        const st = this.rincStamp(ctx, '3 x 2', W / 2, top + 92, 132, '#f8fafc', t, 40, 4, W * 0.6);
        if (st) {
          const lk = ease(seg(t, 66, 90));
          ctx.fillStyle = YOU_C;
          ctx.fillRect(W / 2 - (st.w / 2 + 30) * lk, top + 92 + st.fs * 0.5, (st.w + 60) * lk, 5);
          const fl = ease(seg(t, 60, 76));
          [[-1, '#1d4ed8', '#f8fafc', 'JAPÃO'], [1, '#0b1d4d', '#ef4444', 'FRANÇA']].forEach(([sd, c0, c1, nm]) => {
            const x = W / 2 + sd * (st.w / 2 + 80);
            ctx.save();
            ctx.globalAlpha = fl;
            ctx.fillStyle = c0;
            ctx.fillRect(x - 34, top + 64, 68, 44);
            ctx.fillStyle = c1;
            if (sd < 0) {
              ctx.beginPath();
              ctx.arc(x, top + 86, 13, 0, TAU);
              ctx.fill();
            } else ctx.fillRect(x + 11, top + 64, 23, 44);
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 34, top + 64, 68, 44);
            ctx.restore();
            this.finKicker(ctx, x, top + 128, nm, fl, sd < 0 ? '#60a5fa' : '#f87171', 'center');
          });
        }
        this.finKicker(ctx, W / 2, top + 176, 'FIM DE JOGO • O JAPÃO É CAMPEÃO DO MUNDO SUB-20', seg(t, 96, 140), '#facc15', 'center');
        this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else {
        // os nomes, o suor do Loki e você no meio de todos eles
        const order = [[0, 'SAE ITOSHI', SAE_C, 10], [100, 'RIN ITOSHI', RIN_C, 108], [188, 'JULIAN LOKI', LOKI_C, 198], [240, 'HUGO', HUGO_C, 250]];
        let cur = null;
        order.forEach((o) => {
          if (t >= o[0] && t < 272) cur = o;
        });
        if (cur) {
          this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, cur[0], cur[0] + 8)), '#ffffff');
          this.finKicker(ctx, 40, bot - 40, cur[1], seg(t, cur[3], cur[3] + 28), cur[2]);
          if (cur[0] === 188) {
            const p = scr(K, 53, 0.8, 12.0);
            if (p) {
              this.wcfgSweat(ctx, p.x + 120, p.y - 40, 16, seg(t, 206, 260));
              this.wcfgSweat(ctx, p.x - 130, p.y - 10, 16, seg(t, 236, 300));
            }
          }
        }
        const kE = ease(seg(t, 272, 288));
        if (kE > 0) {
          const cxm = W / 2;
          const cym = (top + bot) / 2;
          const s = lerp(1.6, 1, kE);
          ctx.save();
          ctx.translate(cxm, cym);
          ctx.scale(s, s);
          ctx.translate(-cxm, -cym);
          const R = 118;
          this.cinePanel(ctx, [[cxm, cym - R], [cxm + R * 1.55, cym], [cxm, cym + R], [cxm - R * 1.55, cym]], () => {
            this.wcfgPanelBg(ctx, cxm - 200, cym - 130, 400, 260, '#021016', '#03323a', null);
            const dw = 340;
            const U = dw / 14;
            this.wcfgBand(ctx, c.you, cxm - dw / 2, cym - 3.1 * U, dw, { ring: YOU_C, iris: '#064e3b' });
            this.cineGlow(ctx, cxm, cym, 140, 'rgba(0,245,212,0.25)', 1);
          }, { border: YOU_C, width: 6 });
          ctx.restore();
          this.ptdRings(ctx, cxm, cym, seg(t, 272, 310), [YOU_C, '#ffffff'], 380, 0);
          if (t >= 272) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, 272, 282)));
          this.finKicker(ctx, 40, bot - 40, me, seg(t, 280, 300), YOU_C);
        }
        this.cineFlash(ctx, W, H, seg(t, 312, 330), '#000000');
        this.cineSfx(S, 2, 'p1', () => window.SFX?.page?.());
        this.cineSfx(S, 100, 'p2', () => window.SFX?.page?.());
        this.cineSfx(S, 188, 'p3', () => window.SFX?.page?.());
        this.cineSfx(S, 240, 'p4', () => window.SFX?.page?.());
        this.cineSfx(S, 272, 'voce', () => window.SFX?.kick?.(0.7));
      }
    }
  });
})();
