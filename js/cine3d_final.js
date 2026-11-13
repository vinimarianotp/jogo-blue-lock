// ============================================================================
// CUTSCENES EM 3D — o fim da carreira, refeitas como cinema no padrão do gol da Sub-20
// (js/cine3d_u20.js, ver docs/DIRECAO_DE_ARTE.md): câmera sempre viva, câmera lenta com
// rampa, closes só em quadro de mangá em pixel art, pouco texto. Cada cena acontece no
// mesmo lugar onde a conversa da história em volta é filmada (js/cine3d.js).
//   convocation_call  • a convocação na sala do Ego: a parede de monitores, os 26, a camisa 11
//   camp_night        • a madrugada no seu quarto da concentração (Rin, Sae, Shidou)
//   rin_final_duel    • o último duelo: o campo do Blue Lock na chuva (teto aberto)
//   rin_final_end     • depois do duelo: deitados na grama, o céu, o placar, o Nº 1
//   ballon_dor        • a Bola de Ouro no saguão vestido de gala (Paris no telão)
//   epilogue_destinies• o destino de cada um (um cenário para cada um; o fim no campo)
//   wc_final_goal     • o gol dos quatro egos na final da Copa (a Catedral), um filme próprio
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

  // ==========================================================================
  // CINEMA (o mesmo jeito do gol da Sub-20, js/cine3d_u20.js): câmera lenta com rampa,
  // preto e branco azulado, quadro de impacto, reflexo dos refletores, rede estufando,
  // quadros de mangá em pixel art. Tudo local (nada de mexer nos arquivos comuns).
  // ==========================================================================
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  // tremida suave (ruído, nunca aleatório por quadro) em volta de um ponto [x, y, z]
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // câmera e ator em [x, y, z] do campo (o kit usa [x, altura, y])
  const cam3 = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  // o ponto do mundo guardado para o overlay ({ __w } vira tela no overlay)
  const Wp = (p) => ({ __w: p });
  const stScreen = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[2], v.__w[1]) : v;
    });
    return st;
  };
  // torres dos refletores do campo (lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;
  // preto e branco com tom azulado; circle.inside: só dentro do círculo / fora: só fora dele
  function bwBlue(ctx, W, H, a = 1, circle = null, tint = '#3b82f6') {
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
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // tom de lembrança (sépia alaranjado): o flashback do colégio
  function sepia(ctx, W, H, a = 1) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = clamp(a) * 0.55;
    ctx.fillStyle = '#c2763a';
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
  // reflexo da lente nos refletores visíveis (brilho, risco horizontal e reflexos na diagonal)
  function flares(ctx, K, S, k = 1, tint = '186,230,253') {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.5)', k);
      CE.cineGlow(ctx, p.x, p.y, 40, 'rgba(255,255,255,0.95)', k);
      const gr = ctx.createLinearGradient(p.x - 420, 0, p.x + 420, 0);
      gr.addColorStop(0, `rgba(${tint},0)`);
      gr.addColorStop(0.5, `rgba(${tint},${0.5 * k})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 420, p.y - 2, 840, 4);
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.22)'], [0.8, 14, 'rgba(250,204,21,0.2)'], [1.3, 40, 'rgba(99,102,241,0.14)']].forEach(([fq, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * fq * 2, p.y + (cy - p.y) * fq * 2, r, col, k);
      });
    });
    ctx.restore();
  }
  // brilho de uma lâmpada qualquer (poste, abajur) com o risco horizontal da lente
  function lampFlare(ctx, p, k = 1, r = 90, rgb = '254,240,138') {
    if (!p || k <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CE.cineGlow(ctx, p.x, p.y, r, `rgba(${rgb},0.45)`, k);
    CE.cineGlow(ctx, p.x, p.y, r * 0.3, 'rgba(255,255,255,0.9)', k);
    const gr = ctx.createLinearGradient(p.x - r * 3, 0, p.x + r * 3, 0);
    gr.addColorStop(0, `rgba(${rgb},0)`);
    gr.addColorStop(0.5, `rgba(${rgb},${0.4 * k})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - r * 3, p.y - 1.5, r * 6, 3);
    ctx.restore();
  }
  // rede em primeiro plano estufando onde a bola bate (fio branco, de dentro do gol)
  function netOverlay(ctx, S, hit, q) {
    const { W, top, bot } = S;
    const N = 26;
    const cell = W / N;
    const bulge = (x, y) => {
      if (!hit) return [x, y];
      const dx = x - hit.x;
      const dy = y - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = 260;
      if (d > R) return [x, y];
      const k = Math.cos(((d / R) * Math.PI) / 2) * q;
      return [x + (dx / d) * k * 70, y + (dy / d) * k * 70];
    };
    ctx.save();
    ctx.strokeStyle = 'rgba(241,245,249,0.5)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= N + 2; i++) {
      [0, 1].forEach((side) => {
        ctx.beginPath();
        for (let j = 0; j <= 30; j++) {
          const y = top + ((bot - top) * j) / 30;
          const x = side ? i * cell - (j % 2) * cell * 0.5 + cell * 0.5 : i * cell + (j % 2) * cell * 0.5;
          const [bx, by] = bulge(x, y);
          if (j) ctx.lineTo(bx, by);
          else ctx.moveTo(bx, by);
        }
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  // sombra comprida no gramado (luz de um refletor), na direção ang a partir de (x, y)
  let SHADOWCV = null;
  const shadowCv = () =>
    SHADOWCV ||
    (SHADOWCV = (() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(0,0,0,0.62)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(32, 64, 30, 62, 0, 0, TAU);
      g.fill();
      return c;
    })());
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
    K._push([].concat(V(q0, 0, 0.5), V(q1, 1, 0.5), V(q2, 1, 1), V(q0, 0, 0.5), V(q2, 1, 1), V(q3, 0, 1)), { img: shadowCv(), color: '#000000', alpha: a });
  }
  // as quatro sombras de um jogador no campo (uma de cada torre), como na TV
  const fieldShadows = (K, x, y, a = 0.32) => TOWERS.forEach((tw) => longShadow(K, x, y, 0.9, Math.atan2(y - tw[1], x - tw[0]), 0.26, a));
  // anel de onda no chão (impacto)
  const ringFloorCv = () =>
    canvas('ringfloor', 128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.7, 'rgba(224,242,254,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
  // a bola em pixel art (a do kit) com o giro pela posição
  const ballAt = (K, p, o = {}) => K.ball(p[0], p[1], p[2] || 0, o);
  // confete em pixel (quadradinhos caindo), na tela
  function confetti(ctx, S, t, n = 70, cols = ['#00f5d4', '#facc15', '#f8fafc', '#38bdf8', '#ef4444']) {
    const { W, top, bot } = S;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 6, 8);
    }
    ctx.restore();
  }

  // letra de pixel 3 x 5 (a mesma das placas do prédio, js/hub.js): telões, placar, cartão
  const FONT35 = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', ':': '000010000010000',
    "'": '010010000000000', '/': '001001010100100', '+': '000010111010000', '?': '110001010000010', ',': '000000000010100', 'º': '010101010000111'
  };
  const PLAIN35 = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U', Ç: 'C' };
  function px35(g, str, x, y, color, s = 1, align = 'left') {
    const txt = String(str).toUpperCase().split('').map((c) => PLAIN35[c] || c);
    const wTot = txt.length * 4 * s - s;
    let cx = Math.round(align === 'center' ? x - wTot / 2 : align === 'right' ? x - wTot : x);
    g.fillStyle = color;
    txt.forEach((c) => {
      const bits = FONT35[c];
      if (bits) for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3) * s, Math.round(y) + Math.floor(i / 3) * s, s, s);
      cx += 4 * s;
    });
    return wTot;
  }

  // ---------------------------------------------------------------- quadros de mangá
  // Sempre em pixel art (CA.panel com pixel: 6): nunca o boneco ampliado nem olhos.
  const PIX = 6;
  const CAa = () => CE.ART;
  // mão (de cima, pixel): dedos e polegar; x, y = meio da palma; s = largura; ang
  function handPx(g, x, y, s, o = {}) {
    const skin = o.skin || '#f1c9a5';
    const dark = CE.ART ? CE.ART.shade(skin, -0.28) : '#b98a66';
    g.save();
    g.translate(x, y);
    g.rotate(o.ang || 0);
    if (o.flip) g.scale(-1, 1);
    g.fillStyle = o.sleeve || '#111827';
    g.fillRect(-s * 0.55, s * 0.45, s * 1.1, s * 1.6);
    g.fillStyle = skin;
    g.fillRect(-s * 0.5, -s * 0.2, s, s * 0.7);
    const fold = o.grip ? 0.35 : 1;
    [-0.42, -0.16, 0.1, 0.36].forEach((fx, i) => {
      const len = s * (0.55 + (i === 1 || i === 2 ? 0.1 : 0)) * fold;
      g.fillStyle = skin;
      g.fillRect(fx * s, -s * 0.2 - len, s * 0.22, len);
      g.fillStyle = dark;
      g.fillRect(fx * s + s * 0.16, -s * 0.2 - len, s * 0.06, len);
    });
    g.fillStyle = skin;
    g.fillRect(-s * 0.78, -s * 0.05, s * 0.32, s * 0.22);
    g.fillStyle = dark;
    g.fillRect(-s * 0.5, s * 0.38, s, s * 0.12);
    g.restore();
  }
  // linhas de velocidade curvas (passe com efeito), em arco em volta de (cx, cy)
  function curveLines(g, cx, cy, r0, r1, a0, a1, n, color, t = 0) {
    g.save();
    g.strokeStyle = color;
    for (let i = 0; i < n; i++) {
      const r = lerp(r0, r1, rnd(i, 5));
      const s = a0 + (a1 - a0) * ((rnd(i, 6) + t * 0.02) % 1);
      g.lineWidth = 2 + rnd(i, 7) * 6;
      g.beginPath();
      g.arc(cx, cy, r, s, s + 0.35 + rnd(i, 8) * 0.5);
      g.stroke();
    }
    g.restore();
  }

  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_RIN = { jerseyPrimary: '#0f766e', jerseySecondary: '#020617' };
  // ==========================================================================
  // 1. A CONVOCAÇÃO — na sala do Ego (a conversa logo depois, com bg 'monitor_room', é
  // filmada lá: js/cine3d_espanha.js CE.c3EgoRoom). A parede de monitores acende; os 26
  // rostos aparecem um a um; só o monitor do meio fica escuro ("?") até virar o 11; o Ego
  // joga a camisa 11 (câmera lenta) e você está convocado. Tudo em pixel art.
  // ==========================================================================
  const CONV_NAMES = [
    ['SAE', 'sae'], ['RIN', 'rin'], ['SHIDOU', 'shidou'], ['BACHIRA', 'bachira'], ['NAGI', 'nagi'], ['CHIGIRI', 'chigiri'],
    ['GAGAMARU', 'gagamaru'], ['KUNIGAMI', 'kunigami'], ['REO', 'reo'], ['BAROU', 'barou'], ['HIORI', 'hiori'], ['OTOYA', 'otoya'],
    ['KARASU', 'karasu'], ['YUKIMIYA', 'yukimiya'], ['ARYU', 'aryu'], ['TSURUGI', 'zantetsu'], ['AIKU', 'aiku'], ['NIKO', 'niko'],
    ['TOKIMITSU', 'tokimitsu'], ['KURONA', 'kurona'], ['IGARASHI', 'igarashi'], ['NANASE', 'nanase'], ['KIYORA', 'kiyora'], ['RAICHI', 'raichi'], ['SENDO', 'sendo']
  ];
  const EGO_X = 86;
  const EGO_P = [86, 14.15];
  const YOU_P = [85.2, 16.6];
  // a parede de monitores por cima da do Ego: 9 x 3 telas (a do meio é a sua)
  const CW = { w: 552, h: 236, uw: 8.625, uh: 3.6875, tw: 54, th: 56, gx: 5, gy: 6, mx: 13, my: 10 };
  const tileXY = (c, r) => [CW.mx + c * (CW.tw + CW.gx), CW.my + r * (CW.th + CW.gy)];
  // ordem das telas (pulando a do meio, a 13ª); a 27ª é o escudo
  const TILE_OF = [];
  for (let i = 0; i < 27; i++) if (i !== 13) TILE_OF.push(i);
  const callT = (i) => (i < 6 ? 14 + i * 20 : 130 + (i - 6) * 3.4);
  // centro de uma tela no mundo [x, altura, y] (para brilho no overlay)
  const tileWorld = (i) => {
    const [x, y] = tileXY(i % 9, Math.floor(i / 9));
    return [EGO_X - CW.uw / 2 + ((x + CW.tw / 2) / CW.w) * CW.uw, 0.02 + CW.uh - ((y + CW.th / 2) / CW.h) * CW.uh, 13.03];
  };
  // retrato (o boneco 72 px da frente, só a cabeça, sem ampliar)
  const PORT = new Map();
  const portrait = (key, cd) => {
    let c = PORT.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = 72;
    c.height = 72;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    try {
      window.PixelRenderer.drawCharacterSprite(g, cd, 72, 72, { facing: 'front', accessories: [], shirtNumber: cd.number || 10, view: 'front', left: false, animState: 'idle', frame: 0 });
    } catch (e) {}
    PORT.set(key, c);
    return c;
  };
  function convTile(g, i, st, name, port, k) {
    const [x, y] = tileXY(i % 9, Math.floor(i / 9));
    const { tw, th } = CW;
    g.fillStyle = '#01040a';
    g.fillRect(x - 2, y - 2, tw + 4, th + 4);
    if (st === 'off') {
      g.fillStyle = '#030b16';
      g.fillRect(x, y, tw, th);
      return;
    }
    if (st === 'idle') {
      g.fillStyle = '#05202e';
      g.fillRect(x, y, tw, th);
      for (let yy = y; yy < y + th; yy += 3) {
        g.fillStyle = 'rgba(0,245,212,0.06)';
        g.fillRect(x, yy, tw, 1);
      }
      px35(g, 'JPN', x + tw / 2, y + th / 2 - 3, '#0e7490', 2, 'center');
    } else if (st === 'q') {
      g.fillStyle = '#0b0a02';
      g.fillRect(x, y, tw, th);
      px35(g, '?', x + tw / 2, y + 14, k > 0.5 ? '#facc15' : '#a16207', 6, 'center');
    } else if (st === 'n11') {
      g.fillStyle = '#062a35';
      g.fillRect(x, y, tw, th);
      px35(g, '11', x + tw / 2, y + 13, '#5eead4', 6, 'center');
    } else {
      g.fillStyle = st === 'you' ? '#0b3b44' : '#082f3d';
      g.fillRect(x, y, tw, th);
      if (port) g.drawImage(port, 14, 4, 44, 38, x + 5, y + 1, 44, 38);
      g.fillStyle = '#020617';
      g.fillRect(x, y + th - 13, tw, 13);
      px35(g, name, x + tw / 2, y + th - 10, st === 'you' ? '#facc15' : '#5eead4', 1, 'center');
    }
    // a tela que acabou de acender pisca branco e fica com a borda ciano
    if (k > 0 && st !== 'q') {
      g.fillStyle = `rgba(240,253,250,${0.7 * k})`;
      g.fillRect(x, y, tw, th);
    }
    if (st === 'port' || st === 'you' || st === 'n11') {
      g.strokeStyle = st === 'you' ? '#facc15' : '#00f5d4';
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, tw - 2, th - 2);
    }
  }
  // a parede inteira num quadro: o que cada tela mostra depende do plano e do tempo
  function convWall(g, w, h, phase, t) {
    g.fillStyle = '#01040a';
    g.fillRect(0, 0, w, h);
    const me = CE.cinePlayerName();
    const you = CE.cineYou(Object.assign({}, CE.KITS.japan, { number: 11 }));
    for (let i = 0; i < 27; i++) {
      const c = i % 9;
      const r = Math.floor(i / 9);
      let st = 'idle';
      let k = 0;
      let name = '';
      let port = null;
      const ci = TILE_OF.indexOf(i); // índice do convocado nesta tela (-1 = a do meio)
      if (phase === 0) {
        const d = Math.hypot(c - 4, (r - 1) * 1.6);
        const on = 26 + d * 11;
        st = t < on ? 'off' : 'idle';
        k = clamp(1 - (t - on) / 8) * (t >= on ? 1 : 0);
        if (i === 13) st = t < on ? 'off' : 'q';
      } else if (ci >= 0 && ci < CONV_NAMES.length) {
        const at = phase === 1 ? callT(ci) : -99;
        if (t >= at) {
          st = 'port';
          name = CONV_NAMES[ci][0];
          port = portrait(CONV_NAMES[ci][1], CE.cineChar(CONV_NAMES[ci][1], CE.KITS.japan));
          k = phase === 1 ? clamp(1 - (t - at) / 10) : 0;
        }
      } else if (i === 26) st = 'idle';
      if (i === 13 && phase >= 1) {
        if (phase === 1 || (phase === 2 && t < 84)) {
          st = 'q';
          k = 0;
        } else if (phase <= 3 || (phase === 4 && t < 24)) {
          st = 'n11';
          k = phase === 2 ? clamp(1 - (t - 84) / 12) : 0;
        } else {
          st = 'you';
          name = me;
          port = portrait('you|' + me, you);
          k = clamp(1 - (t - 24) / 12);
        }
      }
      // o "?" pisca (só o brilho da própria tela)
      convTile(g, i, st, name, port, st === 'q' ? (Math.sin(t * 0.15) > 0 ? 1 : 0) : k);
      // no plano do Ego (3) e na camisa (4) os outros apagam um pouco: o olho vai para o meio
      if ((phase === 2 || phase === 3) && i !== 13 && st !== 'off') {
        const [x, y] = tileXY(c, r);
        g.fillStyle = `rgba(1,4,10,${phase === 2 ? 0.55 * seg(t, 0, 40) : 0.55})`;
        g.fillRect(x, y, CW.tw, CW.th);
      }
    }
    // a faixa de LED embaixo
    g.fillStyle = '#020a14';
    g.fillRect(0, h - 44, w, 44);
    g.fillStyle = phase === 4 ? '#facc15' : '#00f5d4';
    g.fillRect(0, h - 40, w, 2);
    px35(g, phase === 0 ? 'SELECAO JAPONESA - CONVOCACAO' : 'COPA DO MUNDO - 26 CONVOCADOS', w / 2, h - 30, phase === 4 ? '#fde047' : '#0e7490', 2, 'center');
  }
  // a camisa 11 em pixel (24 x 26)
  const jersey11 = () =>
    canvas('jersey11px', 24, 26, (g) => {
      g.fillStyle = '#020617';
      g.fillRect(3, 2, 18, 24);
      g.fillRect(0, 3, 24, 9);
      g.fillStyle = '#1d4ed8';
      g.fillRect(4, 3, 16, 22);
      g.fillRect(1, 4, 22, 7);
      g.fillStyle = '#1e40af';
      g.fillRect(16, 3, 4, 22);
      g.fillStyle = '#f8fafc';
      g.fillRect(9, 3, 6, 2);
      g.fillRect(1, 10, 3, 1);
      g.fillRect(20, 10, 3, 1);
      px35(g, '11', 12, 12, '#020617', 1, 'center');
      px35(g, '11', 12, 11, '#f8fafc', 1, 'center');
    });
  // o resto da sala quando a sala do Ego não carregou (não deve acontecer)
  const egoRoom = (K, t, eye) => {
    if (CE.c3EgoRoom) return CE.c3EgoRoom.build(K, t, eye);
    K.sky('#01030a', '#040a18', 0);
    K.fog('#01040b', 0.05);
    K.floor({ x0: 81.5, y0: 12.9, x1: 90.5, y1: 20, color: '#070c16' });
  };
  function convBuild(K, S, eye) {
    egoRoom(K, S.t, eye);
    const wl = live('conv_wall', CW.w, CW.h, S, 1, (g, w, h) => convWall(g, w, h, S.phase, S.t));
    pic(K, { x: EGO_X, y: 13.025, z: 0.02, w: CW.uw, h: CW.uh, ang: Math.PI / 2, img: wl.cv, dirty: wl.dirty, em: true, color: '#ffffff' });
    // a luz das telas no chão
    K.floor({ x0: 82, y0: 13.05, x1: 90, y1: 15.8, img: glowCv('rgba(0,245,212,0.35)'), color: '#ffffff', em: true, alpha: 0.999, z: 0.006 });
  }

  CE.registerCine3D('convocation_call', {
    phases: [170, 210, 150, 170, 180],
    music: 'epic',
    title: '📣 A CONVOCAÇÃO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • A SALA DOS MONITORES', 'PLANO 2 • OS 26 NOMES', 'PLANO 3 • O ATACANTE TITULAR', 'PLANO 4 • A CAMISA 11', 'PLANO 5 • CONVOCADO'],
    get subs() {
      const n = CE.cinePlayerName();
      return [
        [{ from: 40, who: 'JINPACHI EGO', text: '"26 nomes. Nem um a mais."', color: '#00f5d4' }],
        [{ from: 6, who: 'JINPACHI EGO', text: '"Sae. Rin. Shidou. Bachira. Nagi..."', color: '#00f5d4' }],
        [{ from: 4, who: 'JINPACHI EGO', text: '"E o atacante titular..."', color: '#00f5d4' }],
        [{ from: 112, who: 'NARRADOR', text: 'A camisa 11 já tem dono.', color: '#94a3b8' }],
        [{ from: 30, who: 'NARRADOR', text: `${n}: convocado para a Copa.`, color: '#94a3b8' }]
      ];
    },
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.92);
      const EGO_L = [0.55, 0.78, 0.88];
      const YOU_L = [0.5, 0.62, 0.78];
      let eye;
      let look;
      let fov;
      if (phase === 0) {
        // a grua: do fundo da sala até você; a parede acende em onda a partir do meio
        const k = easeIO(t / 170);
        eye = mix([86.7, 1.6, 19.75], [86.35, 1.02, 19.05], k);
        look = mix([86.0, 1.4, 13.0], [85.85, 0.92, 13.6], k);
        fov = lerp(52, 46, k);
        K.actor('EGO', { x: EGO_P[0], y: EGO_P[1], ang: Math.PI / 2, k: 0.95, light: EGO_L });
        K.actor('you', { x: YOU_P[0], y: YOU_P[1], face: EGO_P, kit: 'japan', extra: { number: 11 }, light: YOU_L });
      } else if (phase === 1) {
        // os nomes: travelling de lado pela parede, o Ego em contraluz atrás da mesa
        const k = easeIO(t / 210);
        const x = lerp(83.4, 88.6, k);
        eye = [x + K.noise(f * 0.5, 2) * 0.01, 0.82, 17.7];
        look = [x + 0.25, 1.72, 13.0];
        fov = 46;
        K.actor('EGO', { x: EGO_P[0], y: EGO_P[1], ang: Math.PI / 2 + (x - 86) * 0.05, k: 0.95, light: EGO_L });
      } else if (phase === 2) {
        // o Ego de frente, por baixo; o monitor do meio vira o 11 em cima da cabeça dele
        const k = easeIO(t / 150);
        // (plano médio do Ego; quando o 11 acende a câmera sobe até a tela do meio)
        const up = easeIO(seg(t, 84, 112));
        eye = [lerp(86.45, 86.35, k), lerp(0.74, 0.8, k), lerp(16.95, 16.7, k)];
        look = [86.0, lerp(0.86, 2.0, up), lerp(14.1, 13.4, up)];
        fov = lerp(44, 48, up);
        K.actor('EGO', { x: EGO_P[0], y: EGO_P[1], ang: Math.PI / 2, k: 0.95, light: t > 84 ? [0.6, 0.95, 1.0] : [0.62, 0.8, 0.9] });
      } else if (phase === 3) {
        // a camisa: de lado, câmera lenta enquanto ela voa da mão do Ego até você
        const A = remap(t, [[0, 0], [40, 40], [110, 60], [170, 120]]);
        K.expo(1.04);
        // (de três quartos: a parede de monitores atrás, a camisa voando por cima da mesa)
        eye = [lerp(88.35, 88.15, t / 170), 0.82, lerp(18.15, 17.9, t / 170)];
        look = [85.55, 0.68, 15.25];
        fov = 48;
        const toss = A > 22 && A < 50;
        K.actor('EGO', { x: EGO_P[0], y: EGO_P[1], face: YOU_P, k: 0.95, anim: toss ? 'call_pass' : 'idle', frame: 0, light: EGO_L });
        const got = A >= 90;
        K.actor('you', { x: YOU_P[0], y: YOU_P[1], face: EGO_P, kit: 'japan', extra: { number: 11 }, anim: A > 70 && A < 104 ? 'call_pass' : 'idle', frame: 0, light: YOU_L });
        const q = seg(A, 40, 90);
        let jp;
        if (A < 40) jp = [EGO_P[0] + 0.12, EGO_P[1] + 0.22, 0.5];
        else if (!got) jp = [lerp(EGO_P[0] + 0.12, YOU_P[0] + 0.08, q), lerp(EGO_P[1] + 0.22, YOU_P[1] - 0.18, q), lerp(0.5, 0.42, q) + Math.sin(q * Math.PI) * 0.6];
        else jp = [YOU_P[0] + 0.08, YOU_P[1] - 0.18, 0.4];
        const spin = A < 40 || got ? 1 : Math.cos((A - 40) * 0.22);
        if (A >= 40 || t > 4) K.sprite(jersey11(), { x: jp[0], y: jp[1], z: jp[2], w: 0.3 * Math.max(0.12, Math.abs(spin)), h: 0.33, light: [1.05, 1.1, 1.15] });
        st.jersey = Wp([jp[0], jp[1], jp[2] + 0.16]);
        st.slow = t > 40 && t < 110;
      } else {
        // convocado: você de frente com a camisa 11; a grua sobe e mostra a parede inteira
        const k = easeIO(seg(t, 10, 180));
        eye = mix([85.45, 0.58, 19.25], [86.1, 1.42, 19.7], k);
        look = mix([85.2, 0.6, 16.4], [85.9, 1.25, 13.6], k);
        fov = lerp(44, 54, k);
        K.actor('EGO', { x: EGO_P[0], y: EGO_P[1], ang: Math.PI / 2, k: 0.95, light: EGO_L });
        K.actor('you', { x: YOU_P[0], y: YOU_P[1], ang: Math.PI / 2, kit: 'japan', extra: { number: 11 }, light: [0.62, 0.74, 0.86] });
        K.sprite(jersey11(), { x: YOU_P[0] + 0.02, y: YOU_P[1] + 0.12, z: 0.2, w: 0.32, h: 0.35, light: [1.0, 1.05, 1.1] });
        st.you = Wp([YOU_P[0], YOU_P[1], 0.5]);
      }
      K.cam(eye, look, fov);
      convBuild(K, S, eye);
      st.mid = Wp((() => {
        const p = tileWorld(13);
        return [p[0], p[2], p[1]];
      })());
      if (phase === 1) {
        // a tela que está sendo chamada agora (para o brilho no overlay)
        let cur = -1;
        for (let i = 0; i < CONV_NAMES.length; i++) if (t >= callT(i)) cur = i;
        if (cur >= 0) {
          const p = tileWorld(TILE_OF[cur]);
          st.call = Wp([p[0], p[2], p[1]]);
          st.callK = clamp(1 - (t - callT(cur)) / 16);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      CE.cineDust(ctx, W, H, t, 26, 'rgba(153,246,228,0.5)', 5 + phase);
      if (phase === 0) {
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 24), '#000000');
        CE.finKicker(ctx, 40, top + 32, 'SEDE DA SELEÇÃO JAPONESA • TÓQUIO • 23:00', seg(t, 30, 80));
      } else if (phase === 1) {
        if (st.call && st.callK > 0) CE.cineGlow(ctx, st.call.x, st.call.y, 90, 'rgba(0,245,212,0.45)', st.callK);
        CE.cineSfx(S, 14, 'n1', () => window.SFX?.blip?.(520));
        CE.cineSfx(S, 130, 'cascata', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        if (st.mid) {
          if (t < 84) CE.cineGlow(ctx, st.mid.x, st.mid.y, 70, 'rgba(250,204,21,0.25)', 0.5 + 0.5 * (Math.sin(t * 0.15) > 0 ? 1 : 0));
          else lampFlare(ctx, st.mid, 1 - seg(t, 84, 150) * 0.5, 130, '94,234,212');
        }
        if (t >= 84) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, 84, 94)), '#ccfbf1');
        CE.cineSfx(S, 84, 'onze', () => window.SFX?.kick?.(0.7));
      } else if (phase === 3) {
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.25 * seg(t, 40, 56) * (1 - seg(t, 96, 110));
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (st.jersey) CE.cineGlow(ctx, st.jersey.x, st.jersey.y, 60, 'rgba(147,197,253,0.4)', 0.8);
        // quadro de mangá: as suas mãos agarrando a camisa 11 (pixel art)
        if (t > 138) convCutCatch(ctx, S, seg(t, 138, 147), seg(t, 138, 170));
        CE.cineSfx(S, 40, 'joga', () => window.SFX?.whoosh?.());
      } else {
        if (st.mid) lampFlare(ctx, st.mid, 0.7, 110, '253,224,71');
        CE.finKicker(ctx, 40, bot - 40, `CONVOCADO • CAMISA 11 • ${CE.cinePlayerName()}`, seg(t, 50, 110), '#facc15');
        CE.cineSfx(S, 24, 'convocado', () => window.SFX?.whoosh?.());
      }
    }
  });
  // as mãos pegando a camisa 11 no ar (quadro de mangá em pixel art)
  function convCutCatch(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const you = CE.cineYou();
    CA.panel(
      ctx,
      [[W * 0.56, top + 26], [W - 20, top + 16], [W - 20, bot - 20], [W * 0.6, bot - 30]],
      (b, g) => {
        g.fillStyle = '#e0f2fe';
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.speedRadial(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.45, S.W, S.H, { color: 'rgba(15,23,42,0.5)', inner: b.h * 0.32, n: 50, thick: 1.2 });
        const cx = b.x + b.w * 0.5 + b.ox;
        const cy = b.y + b.h * (0.42 + 0.04 * ease(q));
        const s = b.h * 0.5;
        g.imageSmoothingEnabled = false;
        g.drawImage(jersey11(), cx - s * 0.46, cy - s * 0.5, s * 0.92, s);
        const sk = you.skinColor || '#f1c9a5';
        const e = ease(q * 2);
        handPx(g, cx - s * lerp(0.75, 0.5, e), cy + s * 0.05, s * 0.28, { skin: sk, sleeve: '#1d4ed8', ang: 0.5, grip: e > 0.8 });
        handPx(g, cx + s * lerp(0.75, 0.5, e), cy + s * 0.05, s * 0.28, { skin: sk, sleeve: '#1d4ed8', ang: -0.5, flip: true, grip: e > 0.8 });
      },
      { k: kIn, from: [W * 0.45, 0], pixel: PIX }
    );
  }

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

  // A véspera (camp_night) acontece no SEU QUARTO do prédio da concentração: a conversa logo
  // depois (bg 'hotel_night') é filmada lá (js/cine3d.js). Corredor no escuro → o Rin na
  // janela → o Sae na porta → o Shidou entra gargalhando → os quatro no quarto.
  // Quarto: x 9–16, y 22–30; porta no norte (x 12–13), janela a oeste (y 26–27), cama no canto
  // noroeste, escrivaninha no sudeste. Corredor dos quartos: y 18–21.
  const ROOM = { door: [12.5, 22.0], win: [9.0, 26.5], bed: [9.6, 23.8] };
  // a folha da porta girando na dobradiça (x 12): a = 0 fechada, PI/2 aberta para dentro
  const doorLeaf = (K, a, light) => {
    const hx = 12.02;
    const hy = 22.02;
    K.quad({ x: hx + Math.cos(a) * 0.48, y: hy + Math.sin(a) * 0.48, z: 0, w: 0.96, h: 1.42, ang: a + Math.PI / 2, color: '#1b2741', light });
    K.quad({ x: hx + Math.cos(a) * 0.48, y: hy + Math.sin(a) * 0.48, z: 0, w: 0.96, h: 1.42, ang: a - Math.PI / 2, color: '#1b2741', light });
  };
  // luz do corredor entrando no quarto (cunha quente no chão)
  const wedgeCv = () =>
    canvas('wedge2', 32, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(251,191,36,0.75)');
      gr.addColorStop(1, 'rgba(251,191,36,0)');
      g.fillStyle = gr;
      poly(g, [[8, 0], [24, 0], [w, h], [0, h]]);
      g.fill();
    });
  // o luar da janela no chão
  const moonFloor = (K, a = 1) => {
    K.floor({ x0: 9.0, y0: 25.85, x1: 11.4, y1: 27.35, z: 0.008, img: glowCv('rgba(147,197,253,0.55)'), color: '#ffffff', em: true, alpha: 0.999 * a });
  };
  // o Rin de costas na janela, em contraluz (quadro de mangá em pixel art)
  function campCutWindow(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const rin = CE.cineChar('rin', casual('#1f2a44'));
    CA.panel(
      ctx,
      [[W * 0.58, top + 20], [W - 20, top + 20], [W - 20, bot - 20], [W * 0.62, bot - 20]],
      (b, g) => {
        // a cidade de madrugada na janela
        g.fillStyle = '#0b1a3a';
        g.fillRect(b.x, b.y, b.w, b.h);
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, '#0b1a3a');
        gr.addColorStop(1, '#1e3a8a');
        g.fillStyle = gr;
        g.fillRect(b.x, b.y, b.w, b.h);
        for (let i = 0; i < 26; i++) {
          const bw = 30 + rnd(i, 3) * 50;
          const bh = 60 + rnd(i, 4) * 180;
          const bx = b.x + rnd(i, 5) * b.w;
          g.fillStyle = '#071233';
          g.fillRect(bx, b.y + b.h - bh, bw, bh);
          for (let j = 0; j < 6; j++) if (rnd(i * 7 + j, 6) < 0.35) {
            g.fillStyle = rnd(i + j, 9) < 0.5 ? '#fde68a' : '#93c5fd';
            g.fillRect(bx + 6 + (j % 2) * 14, b.y + b.h - bh + 10 + Math.floor(j / 2) * 18, 6, 8);
          }
        }
        g.fillStyle = 'rgba(226,232,240,0.9)';
        g.beginPath();
        g.arc(b.x + b.w * 0.78, b.y + b.h * 0.2, 22, 0, TAU);
        g.fill();
        // a moldura da janela, o bafo no vidro e a mão do Rin encostada nele
        g.fillStyle = '#020617';
        g.fillRect(b.x + b.w * 0.5 - 4, b.y, 8, b.h);
        g.fillRect(b.x, b.y + b.h * 0.55, b.w, 8);
        const hx = b.x + b.w * 0.42 + b.ox;
        const hy = b.y + b.h * (0.62 - 0.03 * ease(q));
        g.fillStyle = `rgba(226,232,240,${0.22 + 0.1 * Math.sin(q * 9)})`;
        g.beginPath();
        g.ellipse(hx + b.h * 0.05, hy - b.h * 0.05, b.h * 0.2, b.h * 0.14, 0, 0, TAU);
        g.fill();
        handPx(g, hx, hy, b.h * 0.2, { skin: rin.skinColor || '#f1c9a5', sleeve: '#1f2a44', ang: -0.15 });
      },
      { k: kIn, from: [W * 0.4, 0], pixel: PIX }
    );
  }
  // grade de noite (azul escuro) e as bordas mais escuras
  const nightGrade = (ctx, S, a = 0.3) => {
    ctx.save();
    ctx.fillStyle = `rgba(2,6,30,${a})`;
    ctx.fillRect(0, 0, S.W, S.H);
    ctx.restore();
  };

  CE.registerCine3D('camp_night', {
    phases: [170, 190, 170, 150, 200],
    music: 'mystery',
    title: '🌃 A VÉSPERA',
    letterbox: 0.12,
    grain: 0.06,
    vignette: 0.6,
    tags: ['PLANO 1 • O CORREDOR', 'PLANO 2 • A JANELA', 'PLANO 3 • A PORTA', 'PLANO 4 • O BARULHO', 'PLANO 5 • QUATRO EGOS'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'O hotel inteiro dorme... quase.', color: '#94a3b8' }],
      [{ from: 24, who: 'RIN ITOSHI', text: '"...Também não consegue dormir?"', color: '#2dd4bf' }],
      [{ from: 50, who: 'SAE ITOSHI', text: '"Barulho na varanda às três?"', color: '#f472b6' }],
      [{ from: 30, who: 'RYUSEI SHIDOU', text: '"Parece velório aqui!"', color: '#f472b6' }],
      [{ from: 30, who: 'NARRADOR', text: 'Quatro egos. Amanhã, um gol só.', color: '#94a3b8' }]
    ],
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      // de madrugada: sem as luzes do teto (só o luar e a luz do corredor)
      K.c.noLights = true;
      K.sky('#020617', '#16336e', 0.6);
      const RIN = casual('#1f2a44');
      const SAE = casual('#e5e7eb');
      const SHI = casual('#be185d');
      const YOU = casual('#1e3a8a');
      const NIGHT = [0.42, 0.5, 0.78];
      const WARM = [0.85, 0.66, 0.5];
      if (phase === 0) {
        // o corredor dos quartos no escuro; a câmera anda até a única porta com luz
        K.expo(0.6);
        const k = easeIO(t / 170);
        K.cam([lerp(4.0, 10.4, k), lerp(0.74, 0.66, k), lerp(19.65, 19.3, k)], [lerp(13.2, 12.55, k), 0.6, lerp(20.4, 21.4, k)], lerp(52, 46, k));
        K.floor({ x0: 12.05, y0: 20.7, x1: 12.95, y1: 21.4, z: 0.008, img: glowCv('rgba(147,197,253,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
        doorLeaf(K, 0, NIGHT);
        st.door = Wp([12.5, 21.05, 0.04]);
      } else if (phase === 1) {
        // dentro: o Rin de costas na janela, você sentado na cama; a câmera vai até ele
        K.expo(0.66);
        doorLeaf(K, 0, NIGHT);
        moonFloor(K);
        K.actor('rin', { x: 9.45, y: 26.5, ang: Math.PI, extra: RIN, light: [0.5, 0.62, 0.95] });
        K.actor('you', { x: ROOM.bed[0], y: ROOM.bed[1], face: [9.45, 26.5], anim: 'sit', seat: 0.3, extra: YOU, light: NIGHT });
        const k = easeIO(t / 190);
        K.cam([lerp(13.3, 12.15, k), lerp(0.82, 0.74, k), lerp(28.1, 27.3, k)], [lerp(9.9, 9.6, k), 0.72, lerp(25.6, 26.1, k)], lerp(50, 44, k));
        st.win = Wp([9.02, 0.95, 26.5]);
      } else if (phase === 2) {
        // a porta abre: o Sae parado no vão, a luz do corredor atrás dele
        K.expo(0.66);
        const op = easeIO(seg(t, 26, 60));
        doorLeaf(K, op * 1.45, NIGHT);
        if (op > 0) {
          K.floor({ x0: lerp(12.3, 11.95, op), y0: 22.02, x1: lerp(12.7, 13.05, op), y1: lerp(22.6, 24.8, op), z: 0.01, img: wedgeCv(), color: '#ffffff', em: true, alpha: 0.999 });
          K.actor('sae', { x: 12.5, y: 21.75, ang: Math.PI / 2, extra: SAE, light: [0.62, 0.5, 0.4], alpha: Math.min(1, op * 1.5) });
        }
        moonFloor(K, 0.7);
        const k = easeIO(t / 170);
        K.cam([lerp(13.4, 13.15, k), lerp(0.4, 0.46, k), lerp(26.7, 26.0, k)], [12.5, lerp(0.7, 0.78, k), 22.0], lerp(48, 44, k));
        st.doorLight = Wp([12.5, 0.8, 21.5]);
        st.op = op;
      } else if (phase === 3) {
        // o Shidou escancara a porta gargalhando; a câmera treme e entra
        K.expo(0.72);
        const run = ease(seg(t, 10, 40));
        doorLeaf(K, 1.45 + Math.sin(seg(t, 10, 26) * Math.PI) * 0.12, WARM);
        K.floor({ x0: 11.95, y0: 22.02, x1: 13.05, y1: 24.8, z: 0.01, img: wedgeCv(), color: '#ffffff', em: true, alpha: 0.999 });
        K.actor('sae', { x: lerp(12.5, 11.75, ease(seg(t, 12, 34))), y: lerp(21.75, 22.45, ease(seg(t, 12, 34))), face: [12.6, 23.5], extra: SAE, light: [0.7, 0.58, 0.5] });
        K.actor('shidou', { x: lerp(12.6, 12.75, run), y: lerp(20.9, 23.3, run), face: [12.4, 26], anim: t < 40 ? 'run' : 'celebrate', frame: Math.floor(f / 3), extra: SHI, light: [0.95, 0.72, 0.72], opts: { expr: 'laugh' } });
        K.actor('you', { x: ROOM.bed[0], y: ROOM.bed[1], face: [12.6, 23], anim: 'sit', seat: 0.3, extra: YOU, light: NIGHT });
        moonFloor(K, 0.6);
        const k = easeIO(t / 150);
        const sh = t > 22 && t < 70 ? 0.03 * (1 - seg(t, 22, 70)) : 0.003;
        K.cam(shake(K, [lerp(11.0, 11.5, k), lerp(0.36, 0.42, k), lerp(26.6, 26.0, k)], f * 2, sh, 3), [12.6, 0.8, 22.8], lerp(52, 46, k));
        st.shi = Wp([12.75, 1.2, lerp(20.9, 23.3, run)]);
      } else {
        // os quatro: o abajur aceso; a grua sobe devagar até o canto do teto
        K.expo(0.78);
        doorLeaf(K, 1.45, WARM);
        K.floor({ x0: 11.95, y0: 22.02, x1: 13.05, y1: 24.8, z: 0.01, img: wedgeCv(), color: '#ffffff', em: true, alpha: 0.999 });
        moonFloor(K, 0.6);
        K.floor({ x0: 8.6, y0: 23.9, x1: 10.6, y1: 26.0, z: 0.009, img: glowCv('rgba(253,224,71,0.5)'), color: '#ffffff', em: true, alpha: 0.999 });
        K.actor('rin', { x: 9.55, y: 26.6, face: [12, 25], extra: RIN, light: [0.55, 0.62, 0.9] });
        K.actor('sae', { x: 11.75, y: 22.45, face: [11.5, 26], extra: SAE, light: [0.75, 0.62, 0.52] });
        K.actor('shidou', { x: 13.2, y: 24.7, face: [10, 24.5], anim: 'sit_floor', extra: SHI, light: [0.8, 0.62, 0.66] });
        K.actor('you', { x: ROOM.bed[0], y: ROOM.bed[1], face: [12, 25.5], anim: 'sit', seat: 0.3, extra: YOU, light: [0.72, 0.66, 0.6] });
        const k = easeIO(t / 200);
        K.cam(mix([13.9, 0.62, 27.7], [14.65, 1.35, 28.55], k), mix([11.4, 0.55, 24.6], [11.3, 0.36, 24.7], k), lerp(50, 54, k));
        st.lamp = Wp([9.36, 0.62, 24.95]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      if (phase === 0) {
        nightGrade(ctx, S, 0.3);
        if (st.door) CE.cineGlow(ctx, st.door.x, st.door.y, 60, 'rgba(147,197,253,0.35)', 0.8);
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 24), '#000000');
        CE.finKicker(ctx, 40, top + 32, 'CONCENTRAÇÃO DA SELEÇÃO • 02:47', seg(t, 20, 80));
      } else if (phase === 1) {
        nightGrade(ctx, S, 0.2);
        // o luar entrando pela janela (feixes)
        if (st.win) CE.cineShafts(ctx, st.win.x, st.win.y, 0.5, 520, 0.45, 4, '147,197,253', 0.08, t);
        CE.cineDust(ctx, W, H, t, 24, 'rgba(191,219,254,0.5)', 9);
        if (t > 108) campCutWindow(ctx, S, seg(t, 108, 117), seg(t, 108, 190));
      } else if (phase === 2) {
        nightGrade(ctx, S, 0.2);
        if (st.doorLight && st.op > 0) {
          CE.cineGlow(ctx, st.doorLight.x, st.doorLight.y, 160, 'rgba(251,191,36,0.35)', st.op);
          lampFlare(ctx, st.doorLight, st.op * 0.5, 70, '253,186,116');
        }
        CE.cineSfx(S, 26, 'porta', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        nightGrade(ctx, S, 0.12);
        if (t >= 22) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 22, 32)), '#fde68a');
        if (t >= 22 && t < 30 && st.shi) CE.drawRadialSpeedLines(ctx, st.shi.x, st.shi.y, W, '#fdf2f8', 0.4 * (1 - (t - 22) / 8));
        CE.cineImpactText(ctx, 'HA HA HA!', W * 0.7, top + 110, 84, '#f9a8d4', seg(t, 24, 32), W * 0.5, -0.12);
        CE.cineSfx(S, 22, 'haha', () => window.SFX?.tackle?.());
      } else {
        nightGrade(ctx, S, 0.1);
        if (st.lamp) lampFlare(ctx, st.lamp, 0.8, 60, '253,224,71');
        CE.cineDust(ctx, W, H, t, 20, 'rgba(254,240,138,0.45)', 13);
        CE.finKicker(ctx, W - 40, bot - 34, 'AMANHÃ • JAPÃO x COREIA DO SUL', seg(t, 120, 170), '#facc15', 'right');
      }
    }
  });

  // ==========================================================================
  // 3. O ÚLTIMO DUELO e 4. DEPOIS DO DUELO — o campo do Blue Lock, de noite e na chuva.
  // No tema do Blue Lock o campo é coberto: o teto fica aberto (a noite entra e a chuva
  // cai). O telão fica na parede norte, em cima do gol (antes ficava atrás da parede).
  // ==========================================================================
  const BIG = { x: 53, y: 6.07, z: 2.0, w: 5.6, h: 2.1, ang: Math.PI / 2 };
  const YOU_D = [53, 15.45];
  const RIN_D = [53, 13.55];
  // o teto aberto: o céu da noite (pixel) no lugar das luminárias
  const skyRoofCv = (S, clear) =>
    live('sky_roof', 128, 128, S, 4, (g, w, h) => {
      g.fillStyle = '#02040c';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const a = clear * (0.4 + 0.6 * rnd(i, 31));
        if (a < 0.05) continue;
        g.fillStyle = `rgba(226,232,240,${a})`;
        g.fillRect(Math.floor(rnd(i, 32) * w), Math.floor(rnd(i, 33) * h), 1, 1);
      }
      if (clear > 0.2) {
        g.fillStyle = `rgba(191,219,254,${clear * 0.2})`;
        g.fillRect(66, 40, 14, 14);
        g.fillStyle = `rgba(226,232,240,${clear})`;
        g.fillRect(70, 43, 6, 8);
        g.fillRect(69, 44, 8, 6);
      }
      // as nuvens abrindo (nuvens em degraus, escuras, saindo para os lados)
      const off = clear * 80;
      for (let i = 0; i < 7; i++) {
        const cy = 8 + i * 18 + rnd(i, 37) * 6;
        const cw = 34 + rnd(i, 38) * 26;
        const cx = (i % 2 ? w - cw * 0.6 + off : -cw * 0.4 - off) + rnd(i, 39) * 30 - 15;
        g.fillStyle = '#070b18';
        g.fillRect(cx, cy, cw, 8);
        g.fillRect(cx + 4, cy - 3, cw * 0.6, 4);
        g.fillRect(cx + cw * 0.3, cy - 6, cw * 0.35, 4);
        g.fillStyle = '#111a33';
        g.fillRect(cx + 4, cy - 4, cw * 0.6, 1);
      }
    });
  function rainField(K, S, o = {}) {
    K.sky('#010309', '#0a1a3a', 0.15);
    K.fog('#050b18', 0.03);
    K.expo(o.expo || 0.88);
    const sk = skyRoofCv(S, o.clear || 0);
    K.floor({ x0: 44.5, y0: 5.5, x1: 61.5, y1: 23.5, z: 6.9, img: sk.cv, dirty: sk.dirty, color: '#ffffff', em: true });
    // poças com anéis da chuva
    [[51.4, 13.4], [54.6, 15.8], [54.2, 13.0], [51.8, 16.1], [52.6, 11.6], [53.9, 17.4]].forEach(([x, y], j) => {
      K.floor({ x0: x - 0.45, y0: y - 0.2, x1: x + 0.45, y1: y + 0.2, z: 0.008, img: puddleCv(), color: '#ffffff', alpha: 0.999 });
      if (o.rain !== 0) {
        for (let i = 0; i < 2; i++) {
          const ph = (S.t * 0.02 * (o.rate || 1) + i * 0.5 + j * 0.3) % 1;
          const r = 0.06 + ph * 0.3;
          const ox = (rnd(j * 3 + i + Math.floor(S.t * 0.02 + i * 0.5 + j * 0.3) * 7, 60) - 0.5) * 0.4;
          K.floor({ x0: x - r + ox, y0: y - r * 0.6, x1: x + r + ox, y1: y + r * 0.6, z: 0.012, img: rippleCv(), color: '#ffffff', alpha: (1 - ph) * 0.6, em: true });
        }
      }
    });
  }
  const puddleCv = () =>
    canvas('poca_px', 24, 12, (g, w, h) => {
      g.fillStyle = 'rgba(30,58,95,0.8)';
      g.fillRect(3, 2, w - 6, h - 4);
      g.fillRect(1, 4, w - 2, h - 8);
      g.fillStyle = 'rgba(191,219,254,0.3)';
      g.fillRect(6, 4, 7, 2);
    });
  const rippleCv = () =>
    canvas('ripple_px', 24, 24, (g) => {
      g.fillStyle = 'rgba(191,219,254,0.9)';
      [[8, 2, 8, 1], [8, 21, 8, 1], [2, 8, 1, 8], [21, 8, 1, 8], [4, 4, 4, 1], [16, 4, 4, 1], [4, 19, 4, 1], [16, 19, 4, 1], [3, 5, 1, 3], [20, 5, 1, 3], [3, 16, 1, 3], [20, 16, 1, 3]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
    });
  // o telão (pixel): 'logo' | 'ego' | 'score' | 'rank'
  function bigBoard(g, w, h, mode, t) {
    g.fillStyle = '#020a14';
    g.fillRect(0, 0, w, h);
    const name = CE.cinePlayerName();
    if (mode === 'logo') {
      px35(g, 'BLUE LOCK', w / 2, 18, '#00f5d4', 3, 'center');
      px35(g, 'Nº1 ?', w / 2, 52, '#facc15', 3, 'center');
    } else if (mode === 'ego') {
      // o Ego em pé no tamanho do boneco (sem ampliar), ao vivo da sala dele
      g.fillStyle = '#04202c';
      g.fillRect(10, 8, 96, 76);
      const port = portrait('EGO', CE.getSpeakerCharData('JINPACHI EGO') || {});
      g.drawImage(port, 22, 10, 72, 72);
      g.fillStyle = t % 40 < 26 ? '#ef4444' : '#7f1d1d';
      g.fillRect(14, 12, 4, 4);
      px35(g, 'AO VIVO', 21, 12, '#fca5a5', 1, 'left');
      px35(g, 'SEM TORCIDA.', 112, 22, '#e2e8f0', 2, 'left');
      px35(g, 'SO EGO.', 112, 46, '#00f5d4', 3, 'left');
      const tk = '3 GOLS - QUEM MARCAR PRIMEIRO E O Nº1 DO BLUE LOCK - ';
      const off = Math.floor(t * 0.8) % (tk.length * 4);
      g.fillStyle = '#00f5d4';
      g.fillRect(0, h - 12, w, 12);
      px35(g, tk + tk, -off + 2, h - 9, '#020617', 1, 'left');
    } else if (mode === 'score') {
      const [sh, sa] = CE.finScore();
      px35(g, 'DUELO PELO Nº1', w / 2, 8, '#00f5d4', 1, 'center');
      px35(g, 'VOCE', 50, 40, '#f8fafc', 2, 'center');
      px35(g, 'RIN', w - 50, 40, '#2dd4bf', 2, 'center');
      px35(g, `${sh}-${sa}`, w / 2, 30, '#facc15', 5, 'center');
      px35(g, 'FIM DE JOGO', w / 2, 74, '#f87171', 2, 'center');
    } else {
      px35(g, 'RANKING DO BLUE LOCK', w / 2, 6, '#00f5d4', 1, 'center');
      const row = (y, k, rank, col, hi) => {
        if (k <= 0) return;
        const x = 20 + (1 - ease(k)) * 240;
        g.fillStyle = hi ? '#3b2f05' : '#071526';
        g.fillRect(x, y - 3, 216, 26);
        g.fillStyle = col;
        g.fillRect(x, y - 3, 3, 26);
        px35(g, rank, x + 8, y + 3, col, 3, 'left');
      };
      const land = 92;
      row(54, seg(t, 6, 22), 'Nº2', '#2dd4bf', false);
      if (t >= 6) px35(g, 'RIN ITOSHI', 92 + (1 - ease(seg(t, 6, 22))) * 240, 61, '#e2e8f0', 2, 'left');
      row(20, seg(t, 26, 42), 'Nº1', '#facc15', t >= land);
      if (t >= 26) {
        const pool = ['SHIDOU', 'BACHIRA', 'NAGI', 'KUNIGAMI', 'BAROU', 'CHIGIRI', 'REO', 'RIN'];
        const nm = t < land ? pool[Math.floor(t / 3) % pool.length] : name;
        px35(g, nm.slice(0, 13), 92 + (1 - ease(seg(t, 26, 42))) * 240, 27, t < land ? '#64748b' : '#facc15', 2, 'left');
      }
    }
    // linhas do LED
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  }
  const bigScreen = (K, S, mode) => {
    const b = live('bigboard', 256, 96, S, 2, (g, w, h) => bigBoard(g, w, h, mode, S.t));
    K.quad({ x: BIG.x, y: BIG.y + 0.02, z: BIG.z - 0.06, w: BIG.w + 0.16, h: BIG.h + 0.12, ang: Math.PI / 2, color: '#020409' });
    pic(K, Object.assign({}, BIG, { y: BIG.y + 0.04, img: b.cv, dirty: b.dirty, em: true, color: '#ffffff' }));
  };
  // chuteira afundando na grama molhada (respingo), em pixel
  function duelCutBoot(ctx, S, kIn, q, side) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const mid = W * 0.5;
    const poly0 = side < 0 ? [[18, top + 18], [mid - 14, top + 18], [mid - 64, bot - 18], [18, bot - 18]] : [[mid + 6, top + 18], [W - 18, top + 18], [W - 18, bot - 18], [mid - 44, bot - 18]];
    CA.panel(
      ctx,
      poly0,
      (b, g) => {
        g.fillStyle = side < 0 ? '#042f2e' : '#0b1530';
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.speedLines(g, Math.PI / 2 + side * 0.15, S.W, S.H, { color: 'rgba(191,219,254,0.5)', n: 40, t: q * 80, speed: 40, thick: 2 });
        const gy = b.y + b.h * 0.78;
        g.fillStyle = '#14532d';
        g.fillRect(b.x, gy, b.w, b.h);
        g.fillStyle = 'rgba(147,197,253,0.35)';
        g.fillRect(b.x, gy, b.w, 6);
        const e = ease(q * 1.5);
        const bx = b.x + b.w * 0.5 + b.ox;
        CA.boot(g, bx, gy - 10 + e * 14, b.h * 0.14, side < 0 ? { sock: '#0f766e', sock2: '#020617', boot: '#0f172a', ang: 0.15, flip: true } : { sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee', ang: -0.15 });
        // o respingo: gotas subindo em leque
        if (q > 0.2) {
          const sq = seg(q, 0.2, 1);
          g.fillStyle = '#bfdbfe';
          for (let i = 0; i < 18; i++) {
            const a = -Math.PI * (0.1 + 0.8 * rnd(i, 50));
            const d = sq * b.h * (0.15 + rnd(i, 51) * 0.3);
            g.fillRect(bx + Math.cos(a) * d * 1.4, gy + Math.sin(a) * d + sq * sq * 30, 7, 7);
          }
        }
      },
      { k: kIn, from: [side * W * 0.5, 0], pixel: PIX }
    );
  }
  // a bola parada no círculo central com a chuva batendo (pixel)
  function duelCutBall(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[W * 0.3, top + 24], [W * 0.7, top + 14], [W * 0.72, bot - 22], [W * 0.28, bot - 30]],
      (b, g) => {
        g.fillStyle = '#05122a';
        g.fillRect(b.x, b.y, b.w, b.h);
        const gy = b.y + b.h * 0.7;
        g.fillStyle = '#166534';
        g.fillRect(b.x, gy, b.w, b.h);
        g.fillStyle = '#e2e8f0';
        g.fillRect(b.x, gy + 18, b.w, 8);
        const bx = b.x + b.w * 0.5 + b.ox;
        CA.ball(g, bx, gy - b.h * 0.1, b.h * 0.15, { rot: 0.4 });
        g.fillStyle = '#93c5fd';
        for (let i = 0; i < 40; i++) {
          const x = b.x + rnd(i, 71) * b.w;
          const y = b.y + ((rnd(i, 72) * b.h + q * 900 * (0.8 + rnd(i, 73))) % (b.h * 0.75));
          g.fillRect(x, y, 4, 22);
        }
        // a gota batendo na bola
        const ph = (q * 6) % 1;
        g.fillStyle = `rgba(219,234,254,${1 - ph})`;
        for (let i = 0; i < 6; i++) g.fillRect(bx - 20 + i * 8 - ph * 30 * (i < 3 ? 1 : -1), gy - b.h * 0.27 - ph * 30, 6, 6);
      },
      { k: kIn, from: [0, -S.H * 0.4], pixel: PIX }
    );
  }

  const DUEL_P4 = [[0, 0], [50, 40], [170, 62], [220, 102]];
  CE.registerCine3D('rin_final_duel', {
    phases: [190, 180, 170, 220, 190],
    music: 'tension',
    title: '🌧️ O ÚLTIMO DUELO',
    letterbox: 0.12,
    grain: 0.06,
    vignette: 0.55,
    tags: ['PLANO 1 • O ESTÁDIO VAZIO', 'PLANO 2 • FRENTE A FRENTE', 'PLANO 3 • O TELÃO', 'PLANO 4 • OS MONSTROS', 'PLANO 5 • O ÚLTIMO DUELO'],
    get subs() {
      const me = CE.cinePlayerName();
      return [
        [{ from: 30, who: 'NARRADOR', text: 'Só a chuva... e dois atacantes.', color: '#94a3b8' }],
        [
          { from: 10, to: 90, who: 'RIN ITOSHI', text: '"Você veio."', color: '#2dd4bf' },
          { from: 90, who: me, text: '"Claro."', color: '#00f5d4' }
        ],
        [{ from: 30, who: 'JINPACHI EGO', text: '"Sem torcida. Só ego."', color: '#00f5d4' }],
        [{ from: 30, who: 'NARRADOR', text: 'O monstro do Rin acorda... e o seu responde.', color: '#94a3b8' }],
        [{ from: 100, who: 'NARRADOR', text: 'Um é o nº 1. O outro, o 2 pra sempre.', color: '#94a3b8' }]
      ];
    },
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const rinX = { extra: Object.assign({ angry: true }, KIT_RIN) };
      const youX = { extra: KIT_BL };
      rainField(K, S, { rate: phase === 3 ? lerp(1, 0.25, seg(t, 40, 60)) : 1 });
      bigScreen(K, S, phase === 2 ? 'ego' : 'logo');
      if (phase === 0) {
        // a grua: do alto do estádio vazio até os dois no círculo central
        const k = easeIO(t / 190);
        K.actor('you', Object.assign({ x: YOU_D[0], y: YOU_D[1], ang: -Math.PI / 2 }, youX));
        K.actor('rin', Object.assign({ x: RIN_D[0], y: RIN_D[1], ang: Math.PI / 2 }, rinX));
        K.ball(53, 14.5, 0.05);
        K.cam(mix([56.6, 5.6, 22.2], [54.6, 1.15, 18.5], k), mix([53, 0.1, 12.0], [53, 0.55, 14.5], k), lerp(62, 46, k));
      } else if (phase === 1) {
        // frente a frente: de lado, rente à grama molhada, a câmera andando devagar
        const k = easeIO(t / 180);
        K.actor('you', Object.assign({ x: YOU_D[0], y: YOU_D[1], ang: -Math.PI / 2, light: [0.62, 0.72, 0.95] }, youX));
        K.actor('rin', Object.assign({ x: RIN_D[0], y: RIN_D[1], ang: Math.PI / 2, light: [0.55, 0.85, 0.88] }, rinX));
        K.ball(53, 14.5, 0.05);
        K.cam([lerp(56.0, 55.65, k), lerp(0.3, 0.36, k), lerp(14.15, 14.85, k)], [53, 0.52, 14.5], 44);
      } else if (phase === 2) {
        // o telão: de trás de você, de baixo; o Ego aparece lá em cima; um relâmpago
        const k = easeIO(t / 170);
        K.actor('you', Object.assign({ x: YOU_D[0], y: YOU_D[1], ang: -Math.PI / 2, light: [0.4, 0.62, 0.72] }, youX));
        K.actor('rin', Object.assign({ x: RIN_D[0], y: RIN_D[1], face: [53, 6], light: [0.4, 0.62, 0.72] }, rinX));
        K.floor({ x0: 50.2, y0: 6.1, x1: 55.8, y1: 9.5, color: '#00f5d4', alpha: 0.08, em: true });
        K.cam([lerp(53.55, 53.35, k), lerp(0.3, 0.55, k), lerp(18.5, 18.0, k)], [53, lerp(1.7, 2.4, k), 6.1], lerp(54, 46, k));
        st.big = Wp([53, 6.1, 3.05]);
      } else if (phase === 3) {
        // os monstros: câmera lenta, a câmera girando devagar em volta dos dois
        const A = remap(t, DUEL_P4);
        const a = lerp(-0.42, 0.42, easeIO(t / 220));
        const lean = seg(A, 20, 50);
        K.actor('you', Object.assign({ x: YOU_D[0], y: YOU_D[1], ang: -Math.PI / 2, anim: lean > 0 ? 'windup' : 'idle', frame: 1, light: [0.55, 0.8, 1.0] }, youX));
        K.actor('rin', Object.assign({ x: RIN_D[0], y: RIN_D[1], ang: Math.PI / 2, anim: lean > 0 ? 'windup' : 'idle', frame: 1, light: [0.45, 0.9, 0.85] }, rinX));
        K.ball(53, 14.5, 0.05);
        K.cam([53 + Math.cos(a) * 2.95, 0.42, 14.5 + Math.sin(a) * 2.95], [53, 0.55, 14.5], 44);
        st.you = Wp([YOU_D[0], YOU_D[1], 0.55]);
        st.rin = Wp([RIN_D[0], RIN_D[1], 0.55]);
        st.A = A;
      } else {
        // o último duelo: o apito, os dois arrancam e se chocam na bola (o quadro congela)
        const CL = 70;
        const tt = Math.min(t, CL + 1);
        const r = ease(seg(tt, 18, CL));
        const yp = [53, lerp(YOU_D[1], 14.68, r)];
        const rp = [53, lerp(RIN_D[1], 14.32, r)];
        K.actor('you', Object.assign({ x: yp[0], y: yp[1], ang: -Math.PI / 2, anim: tt < CL - 6 ? 'run' : 'shoot', frame: tt < CL - 6 ? Math.floor(f / 3) : 1, opts: tt >= CL - 6 ? { animTime: 6 } : undefined, light: [0.62, 0.75, 1.0] }, youX));
        K.actor('rin', Object.assign({ x: rp[0], y: rp[1], ang: Math.PI / 2, anim: tt < CL - 6 ? 'run' : 'shoot', frame: tt < CL - 6 ? Math.floor(f / 3) + 2 : 1, opts: tt >= CL - 6 ? { animTime: 6 } : undefined, light: [0.5, 0.88, 0.88] }, rinX));
        K.ball(53, 14.5, 0.05 + (t >= CL ? 0.06 : 0));
        if (t >= CL) {
          const q = seg(t, CL, CL + 24);
          const rr = 0.15 + ease(q) * 1.1;
          K.floor({ x0: 53 - rr, y0: 14.5 - rr, x1: 53 + rr, y1: 14.5 + rr, z: 0.014, img: ringFloorCv(), color: '#bfdbfe', alpha: 1 - q, em: true });
          for (let i = 0; i < 20; i++) {
            const a = rnd(i, 3) * TAU;
            const tq = Math.min(t - CL, 14);
            const d = tq * (0.02 + rnd(i, 4) * 0.025);
            const z = Math.max(0, tq * (0.03 + rnd(i, 5) * 0.03) - tq * tq * 0.001);
            K.box({ x0: 53 + Math.cos(a) * d - 0.02, y0: 14.5 + Math.sin(a) * d - 0.02, x1: 53 + Math.cos(a) * d + 0.02, y1: 14.5 + Math.sin(a) * d + 0.02, z0: z, z1: z + 0.04, color: '#bfdbfe', em: true });
          }
        }
        const push = easeIO(seg(t, 0, CL));
        K.cam(shake(K, [lerp(55.8, 55.45, push), 0.3, 14.55], f * 2, t >= CL && t < CL + 30 ? 0.04 * (1 - (t - CL) / 30) : 0.004, 4), [53, 0.5, 14.5], lerp(44, 40, push));
        st.clash = Wp([53, 14.5, 0.45]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.75);
        CE.finSplashes(ctx, 0, W, H * 0.55, bot, t, 30);
        rain(ctx, S);
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 22), '#000000');
        CE.finKicker(ctx, 40, top + 30, 'UMA SEMANA DEPOIS DA COPA', seg(t, 8, 46));
        CE.finKicker(ctx, 40, top + 58, 'ESTÁDIO DO BLUE LOCK • 23:41', seg(t, 36, 80), '#38bdf8');
      } else if (phase === 1) {
        flares(ctx, K, S, 0.5);
        CE.finSplashes(ctx, 160, W - 160, H * 0.62, bot, t, 20);
        rain(ctx, S, 1.1);
        if (t > 110) duelCutBall(ctx, S, seg(t, 110, 119), seg(t, 110, 180));
      } else if (phase === 2) {
        if (st.big) CE.cineGlow(ctx, st.big.x, st.big.y, 260, 'rgba(0,245,212,0.18)', 0.9);
        rain(ctx, S, 1.2);
        // o relâmpago (um clarão só) e o trovão
        if (t >= 120) CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, 120, 128)) + 0.25 * (t > 131 && t < 135 ? 1 : 0), '#e0f2fe');
        CE.cineSfx(S, 120, 'trovao', () => window.SFX?.tackle?.());
      } else if (phase === 3) {
        // o tempo quase parado: sem cor; só o verde-água do Rin e o seu ciano acesos
        const A = st.A || 0;
        const bw = seg(A, 36, 44) * (1 - seg(t, 196, 216));
        bwBlue(ctx, W, H, bw * 0.9);
        if (st.rin) CE.cineGlow(ctx, st.rin.x, st.rin.y, 70, 'rgba(45,212,191,0.4)', bw);
        if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 70, 'rgba(0,245,212,0.4)', bw);
        // a chuva quase parada (o tempo da ação, não o do relógio)
        rain(ctx, Object.assign({}, S, { t: A * 1.5 }), 0.9);
        if (t > 70 && t < 186) duelCutBoot(ctx, S, seg(t, 70, 79), seg(t, 70, 150), -1);
        if (t > 100 && t < 186) duelCutBoot(ctx, S, seg(t, 100, 109), seg(t, 100, 170), 1);
        CE.cineSfx(S, 40, 'lento', () => window.SFX?.whoosh?.());
      } else {
        const CL = 70;
        rain(ctx, S, t < CL ? 1.0 : 0.5);
        if (t >= CL && t < CL + 2) impactFrame(ctx, W, H);
        if (t >= CL) {
          const cp = st.clash || { x: W / 2, y: H * 0.6 };
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, CL + 1, CL + 8)));
          if (t < CL + 8) CE.drawRadialSpeedLines(ctx, cp.x, cp.y, W, '#e0f2fe', 0.5 * (1 - (t - CL) / 8));
          CE.cineGlow(ctx, cp.x, cp.y, 140, 'rgba(191,219,254,0.5)', 1 - seg(t, CL, CL + 20));
          // o quadro congela sem cor e escurece até o preto
          bwBlue(ctx, W, H, seg(t, CL + 4, CL + 20));
          CE.cineFlash(ctx, W, H, seg(t, 120, 150), '#000000');
          CE.finKicker(ctx, W / 2, (top + bot) / 2, 'BLUE LOCK • A DISPUTA PELO Nº 1', seg(t, 140, 170), '#22d3ee', 'center');
        }
        CE.cineSfx(S, 8, 'apito', () => window.SFX?.whistle?.(1));
        CE.cineSfx(S, CL, 'choque', () => window.SFX?.kick?.(1));
      }
    }
  });

  // ---------------------------------------------------------------- depois do duelo
  // os dois deitados, cabeça com cabeça no círculo central (desenhados uma vez, deitados)
  const lying = (who, ch, headRight, face) =>
    pose(`lie|${who}|${headRight ? 1 : 0}|${face || ''}|${CE.cinePlayerName()}`, (g, x, feet, size) => {
      g.save();
      g.translate(x, feet - 70);
      if (headRight) g.scale(-1, 1);
      CE.bdorLying(g, ch, 0.43 * size, 0, size, {});
      g.restore();
    });
  const LIE_R = [52.25, 14.35];
  const LIE_Y = [53.75, 14.65];
  // deitados no chão (câmera de cima) ou em pé virados para a câmera (câmera rente à grama)
  const lieBoth = (K, o = {}) => {
    const rinCh = CE.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
    const youCh = CE.cineYou(KIT_BL);
    const put = o.side ? poseSprite : poseFloor;
    put(K, lying('rin', rinCh, true, null), { x: LIE_R[0], y: LIE_R[1], light: o.light || [0.62, 0.7, 0.85] });
    put(K, lying('you', youCh, false, null), { x: LIE_Y[0], y: LIE_Y[1], light: o.light || [0.62, 0.7, 0.85] });
  };
  // o punho do Rin na grama molhada abrindo devagar (quadro de mangá em pixel art)
  function endCutFist(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const rin = CE.cineChar('rin');
    CA.panel(
      ctx,
      [[W * 0.52, top + 20], [W - 20, top + 20], [W - 20, bot - 20], [W * 0.56, bot - 20]],
      (b, g) => {
        g.fillStyle = '#14532d';
        g.fillRect(b.x, b.y, b.w, b.h);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = i % 2 ? '#166534' : '#15803d';
          g.fillRect(b.x + rnd(i, 81) * b.w, b.y + rnd(i, 82) * b.h, 6, 18);
        }
        g.fillStyle = 'rgba(191,219,254,0.35)';
        g.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.62, b.w * 0.5, 18);
        const open = seg(q, 0.35, 0.8);
        handPx(g, b.x + b.w * 0.48 + b.ox, b.y + b.h * 0.5, b.h * 0.26, { skin: rin.skinColor || '#f1c9a5', sleeve: '#0f766e', ang: Math.PI / 2 + 0.2, grip: open < 0.5 });
        // gotas caindo em volta
        g.fillStyle = '#bfdbfe';
        for (let i = 0; i < 10; i++) {
          const ph = (q * 3 + rnd(i, 83)) % 1;
          if (ph > 0.85) g.fillRect(b.x + rnd(i, 84) * b.w - 8, b.y + rnd(i, 85) * b.h - 2, 16, 4);
        }
      },
      { k: kIn, from: [W * 0.45, 0], pixel: PIX }
    );
  }

  CE.registerCine3D('rin_final_end', {
    phases: [180, 170, 210, 160, 210],
    music: 'promise',
    title: '🌌 O NÚMERO 1',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • O CÉU', 'PLANO 3 • O RIN', 'PLANO 4 • O PLACAR', 'PLANO 5 • RANKING FINAL'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Nenhum dos dois consegue levantar.', color: '#94a3b8' }],
      [{ from: 20, who: 'NARRADOR', text: 'A chuva para. Enfim, estrelas.', color: '#94a3b8' }],
      [
        { from: 10, to: 100, who: 'NARRADOR', text: 'Perdeu.', color: '#94a3b8' },
        { from: 110, who: 'NARRADOR', text: '...e quase sorri.', color: '#2dd4bf' }
      ],
      [{ from: 20, who: 'NARRADOR', text: 'Ninguém grita. Nem precisa.', color: '#94a3b8' }],
      [{ from: 110, who: 'JINPACHI EGO', text: '"...Perfeito."', color: '#00f5d4' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const clear = phase === 0 ? 0 : phase === 1 ? easeIO(seg(t, 10, 150)) : 1;
      rainField(K, S, { clear, rain: phase <= 1 ? 1 : 0, rate: phase === 1 ? 1 - clear : 1, expo: 0.92 });
      bigScreen(K, S, phase === 4 ? 'rank' : 'score');
      if (phase === 0) {
        // de cima (sem passar de ~50°): a grua sobe girando em cima dos dois deitados
        lieBoth(K);
        const k = easeIO(t / 180);
        const a = lerp(0.35, -0.15, k) + Math.PI / 2;
        const r = lerp(1.7, 2.4, k);
        K.cam([53 + Math.cos(a) * r, lerp(1.3, 2.75, k), 14.5 + Math.sin(a) * r], [53, 0, 14.5], 46);
      } else if (phase === 1) {
        // o que eles veem: o teto aberto, as nuvens abrindo e as estrelas
        lieBoth(K);
        const k = easeIO(t / 170);
        K.cam([53.2 + k * 0.2, 0.22, 15.4], [53.3 + k * 0.3, 6.5, lerp(12.2, 11.6, k)], 62);
      } else if (phase === 2) {
        // de lado e um pouco de cima: o Rin deitado na grama molhada; a câmera chega nele
        lieBoth(K, { light: [0.6, 0.7, 0.9] });
        const k = easeIO(t / 210);
        K.cam([lerp(52.6, 52.35, k), lerp(1.15, 0.98, k), lerp(16.45, 16.05, k)], [52.3, 0.02, 14.45], lerp(46, 42, k));
      } else if (phase === 3) {
        // o placar lá em cima, de baixo; os dois deitados na grama lá na frente
        lieBoth(K);
        const k = easeIO(t / 160);
        K.cam([53.4, lerp(0.55, 0.45, k), lerp(17.6, 17.1, k)], [53, lerp(1.4, 2.5, k), 6.1], lerp(52, 46, k));
        st.big = Wp([53, 6.1, 3.05]);
      } else {
        // o ranking final; a grua sobe e se afasta: os dois lá embaixo, o estádio inteiro
        lieBoth(K, { light: [0.5, 0.78, 0.82] });
        const k = easeIO(seg(t, 0, 200));
        K.cam(mix([53.3, 0.9, 11.2], [53.6, 4.4, 20.8], k), mix([53, 2.4, 6.1], [53, 0.4, 13.0], k), lerp(48, 56, k));
        st.big = Wp([53, 6.1, 3.05]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      const [sh, sa] = CE.finScore();
      if (phase === 0) {
        // o vapor da respiração subindo
        [[52.75, 14.4], [53.25, 14.6]].forEach(([x, y], j) => {
          const p = K.screen(x, 0.05, y);
          if (!p) return;
          for (let i = 0; i < 2; i++) {
            const ph = (t * 0.018 + i * 0.5 + j * 0.25) % 1;
            ctx.fillStyle = `rgba(226,232,240,${(1 - ph) * 0.14})`;
            ctx.fillRect(Math.round((p.x + (j ? 1 : -1) * ph * 26) / 6) * 6 - 12, Math.round((p.y - ph * 18) / 6) * 6, 24 + ph * 30, 12 + ph * 12);
          }
        });
        CE.cineRain(ctx, W, H, t, 0.16, 80, 0.1);
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 20), '#000000');
        CE.finKicker(ctx, 40, top + 32, `FIM DE JOGO • VOCÊ ${sh} x ${sa} RIN`, seg(t, 24, 70), '#38bdf8');
      } else if (phase === 1) {
        // as últimas gotas caindo na lente (cada vez menos)
        const nDrops = Math.round(22 * (1 - seg(t, 0, 140)));
        for (let i = 0; i < nDrops; i++) {
          const ph = (t * 0.03 + rnd(i, 70)) % 1;
          const a = rnd(i, 71) * TAU;
          const d = 30 + ph * ph * 520;
          ctx.fillStyle = `rgba(191,219,254,${0.3 + ph * 0.5})`;
          const s = 2 + Math.round(ph * 4) * 2;
          ctx.fillRect(Math.round(W / 2 + Math.cos(a) * d), Math.round(H / 2 + Math.sin(a) * d * 0.7), s, s);
        }
        // uma estrela cadente (pixel) no fim
        const sk = seg(t, 118, 142);
        if (sk > 0 && sk < 1) {
          for (let i = 0; i < 10; i++) {
            ctx.fillStyle = `rgba(255,255,255,${1 - i / 10})`;
            ctx.fillRect(Math.round(lerp(W * 0.25, W * 0.75, sk) - i * 12), Math.round(lerp(top + 60, top + 140, sk) - i * 2.4), 6, 4);
          }
        }
      } else if (phase === 2) {
        CE.finLensDrops(ctx, W, top, bot, 3, 7);
        if (t > 92) endCutFist(ctx, S, seg(t, 92, 101), seg(t, 92, 200));
      } else if (phase === 3) {
        if (st.big) CE.cineGlow(ctx, st.big.x, st.big.y, 240, 'rgba(0,245,212,0.16)', 0.9);
        CE.finLensDrops(ctx, W, top, bot, 4, 6);
      } else {
        if (st.big) CE.cineGlow(ctx, st.big.x, st.big.y, 220, 'rgba(250,204,21,0.14)', seg(t, 92, 110));
        if (t >= 92) {
          CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, 92, 104)), '#fef3c7');
          if (st.big) lampFlare(ctx, st.big, 1 - seg(t, 92, 180) * 0.6, 140, '253,224,71');
        }
        CE.cineSfx(S, 92, 'numero1', () => window.SFX?.goal?.(true));
        CE.cineFlash(ctx, W, H, seg(t, 186, 210), '#000000');
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

  // A Bola de Ouro (ballon_dor) acontece no SAGUÃO do prédio enfeitado de gala: a conversa
  // em volta (bg 'paris_gala') é filmada lá (js/cine3d.js). Palco na frente do telão (norte),
  // duas fileiras de cadeiras, o tapete vermelho vindo da porta (sul) pelo corredor entre os
  // pilares. Saguão: x 17–33, y 9–21; pilares em (21|28, 13|17); sofá no meio (y ~15).
  const GALA = { stage: { x0: 22.4, x1: 27.6, y0: 9.05, y1: 10.5, z: 0.2 }, rows: [11.65, 12.45], aisle: [26.85, 27.75], carpet: { x0: 26.9, x1: 27.7, y0: 11.0, y1: 20.9 } };
  const GALA_TV = { x: 25, y: 9.1, z: 0.42, w: 4.4, h: 1.25 };
  const SEATS_G = [];
  GALA.rows.forEach((y, r) => {
    for (let x = 18.6; x < 31.6; x += 0.68) if (x < GALA.aisle[0] - 0.15 || x > GALA.aisle[1] + 0.15) SEATS_G.push([x + (r % 2) * 0.2, y]);
  });
  const NOA_SEAT = 11; // a cadeira do Noa: primeira fileira, na beira do corredor
  // o telão da gala (pixel): 'paris' | 'env' | 'name'
  function galaBoard(g, w, h, mode, t) {
    g.fillStyle = '#0c0614';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ca8a04';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, h - 2, w, 2);
    // a bola de ouro em pixel (círculo com gomos)
    const gold = (cx, cy, r) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d > r * r) continue;
        const sh = (x + y) / (2 * r);
        g.fillStyle = d > (r - 1.2) * (r - 1.2) ? '#78350f' : sh < -0.35 ? '#fde68a' : sh < 0.15 ? '#facc15' : '#ca8a04';
        if ((x + 1000) % 5 === 0 && Math.abs(y) < r - 2) g.fillStyle = '#a16207';
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    };
    if (mode === 'paris') {
      // a torre Eiffel em pixel (blocos subindo) e o letreiro
      const tx = 40;
      const base = h - 6;
      g.fillStyle = '#facc15';
      for (let y = 0; y < 56; y++) {
        const half = Math.max(1, Math.round(14 * Math.pow(1 - y / 56, 1.6)));
        if (y < 14 && y > 3) {
          g.fillRect(tx - half, base - y, 3, 1);
          g.fillRect(tx + half - 3, base - y, 3, 1);
        } else g.fillRect(tx - half, base - y, half * 2, 1);
      }
      g.fillRect(tx - 10, base - 16, 20, 2);
      g.fillRect(tx - 6, base - 32, 12, 2);
      g.fillStyle = t % 30 < 15 ? '#fef9c3' : '#facc15';
      g.fillRect(tx - 1, base - 60, 2, 4);
      px35(g, 'BOLA DE OURO', 150, 20, '#fde68a', 3, 'center');
      px35(g, 'PARIS', 150, 48, '#e2e8f0', 2, 'center');
    } else if (mode === 'env') {
      gold(52, h / 2, 22);
      px35(g, 'BOLA DE OURO', 160, 18, '#fde68a', 2, 'center');
      px35(g, '? ? ?', 160, 40, t % 40 < 26 ? '#facc15' : '#a16207', 3, 'center');
    } else {
      gold(44, h / 2, 24);
      px35(g, CE.cinePlayerName().slice(0, 13), 160, 22, '#facc15', 3, 'center');
      px35(g, 'JAPAO - BOLA DE OURO', 160, 50, '#e2e8f0', 1, 'center');
    }
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  }
  // a bola de ouro (troféu) em pixel: esfera dourada em cima da base
  const goldTrophyPx = () =>
    canvas('goldtrophy_px', 20, 28, (g) => {
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
        const d = x * x + y * y;
        if (d > 64) continue;
        const sh = (x + y) / 16;
        g.fillStyle = d > 49 ? '#78350f' : sh < -0.35 ? '#fef3c7' : sh < 0.2 ? '#facc15' : '#b45309';
        g.fillRect(10 + x, 9 + y, 1, 1);
      }
      g.fillStyle = '#a16207';
      g.fillRect(7, 18, 6, 3);
      g.fillStyle = '#1c1917';
      g.fillRect(5, 21, 10, 6);
      g.fillStyle = '#ca8a04';
      g.fillRect(5, 21, 10, 1);
    });
  function galaSet(K, S, mode) {
    K.expo(0.92);
    // o palco na frente do telão, a borda dourada e os holofotes
    const st = GALA.stage;
    K.box({ x0: st.x0, y0: st.y0, x1: st.x1, y1: st.y1, z0: 0, z1: st.z, color: '#1b1028', top: '#2a1a36' });
    K.box({ x0: st.x0, y0: st.y1 - 0.04, x1: st.x1, y1: st.y1, z0: st.z - 0.03, z1: st.z + 0.005, color: '#ca8a04', em: true });
    const tv = live('gala_tv', 256, 72, S, 2, (g, w, h) => galaBoard(g, w, h, mode, S.t));
    K.quad({ x: GALA_TV.x, y: GALA_TV.y - 0.01, z: GALA_TV.z - 0.06, w: GALA_TV.w + 0.16, h: GALA_TV.h + 0.12, ang: Math.PI / 2, color: '#120a20' });
    pic(K, Object.assign({}, GALA_TV, { img: tv.cv, dirty: tv.dirty, em: true, color: '#ffffff', ang: Math.PI / 2 }));
    // cortinas vermelhas dos lados do palco
    [st.x0 + 0.25, st.x1 - 0.25].forEach((x) => K.quad({ x, y: 9.12, z: 0, w: 0.7, h: 1.65, ang: Math.PI / 2, img: curtainRedCv(), color: '#ffffff', light: [0.85, 0.7, 0.75] }));
    // o tapete vermelho com a borda dourada
    const c = GALA.carpet;
    K.floor({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, z: 0.01, color: '#991b1b' });
    [c.x0, c.x1].forEach((x) => K.floor({ x0: x - 0.025, y0: c.y0, x1: x + 0.025, y1: c.y1, z: 0.012, color: '#facc15', em: true }));
    K.floor({ x0: 23.6, y0: 10.5, x1: 27.7, y1: 11.05, z: 0.01, color: '#991b1b' });
    // as cadeiras (assento e encosto) das duas fileiras
    SEATS_G.forEach(([x, y]) => {
      K.box({ x0: x - 0.2, y0: y - 0.14, x1: x + 0.2, y1: y + 0.14, z0: 0, z1: 0.14, color: '#5b0a14', top: '#7f1d1d' });
      K.box({ x0: x - 0.2, y0: y + 0.12, x1: x + 0.2, y1: y + 0.2, z0: 0, z1: 0.42, color: '#7f1d1d', top: '#991b1b' });
    });
    // luzes douradas no chão do palco
    K.floor({ x0: 23.4, y0: 9.1, x1: 26.6, y1: 10.5, z: st.z + 0.006, img: glowCv('rgba(254,240,138,0.55)'), color: '#ffffff', em: true, alpha: 0.999 });
  }
  // a plateia nas cadeiras (de pé quando rise(i) = 1); o Noa na dele
  function galaAudience(K, rise, light) {
    const L = extras(21, 40, { clothes: ['#111827', '#1f2937', '#0f172a', '#3f1d2b', '#1e1b4b'] });
    SEATS_G.forEach(([x, y], i) => {
      if (i === NOA_SEAT) return;
      const up = rise(i);
      K.actor(L[i % L.length], { id: 'pl' + i, x, y: y - 0.02, face: [x, 9], anim: up ? 'clap' : 'sit', seat: up ? undefined : 0.12, frame: up ? undefined : 0, k: 0.86, light });
    });
  }
  const NOA_AT = () => SEATS_G[NOA_SEAT];
  // fotógrafos dos dois lados do tapete
  const GALA_PH = [[26.2, 16.2], [26.1, 17.1], [26.25, 18.0], [26.1, 18.9], [26.2, 19.8], [25.4, 16.6], [25.5, 18.5], [25.4, 19.4]];
  // as mãos da apresentadora abrindo o envelope dourado; o cartão sobe com o seu nome
  function galaCutEnvelope(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[W * 0.5, top + 20], [W - 20, top + 30], [W - 30, bot - 20], [W * 0.46, bot - 30]],
      (b, g) => {
        g.fillStyle = '#1a0b20';
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.speedRadial(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.45, S.W, S.H, { color: 'rgba(250,204,21,0.25)', inner: b.h * 0.3, n: 40, thick: 1.2 });
        const cx = b.x + b.w * 0.5 + b.ox;
        const cy = b.y + b.h * 0.6;
        const ew = b.h * 0.7;
        const eh = b.h * 0.42;
        // o cartão subindo de dentro do envelope
        const up = ease(seg(q, 0.25, 0.8));
        g.fillStyle = '#fffbeb';
        g.fillRect(cx - ew * 0.4, cy - eh * 0.3 - up * eh * 0.85, ew * 0.8, eh * 0.75);
        if (up > 0.6) {
          g.save();
          g.imageSmoothingEnabled = false;
          const nm = CE.cinePlayerName().slice(0, 12);
          px35(g, nm, cx, cy - eh * 0.3 - up * eh * 0.85 + eh * 0.22, '#0b1120', Math.max(4, Math.floor((ew * 0.7) / (nm.length * 4))), 'center');
          g.restore();
        }
        g.fillStyle = '#ca8a04';
        g.fillRect(cx - ew / 2, cy - eh * 0.3, ew, eh);
        g.fillStyle = '#facc15';
        g.fillRect(cx - ew / 2, cy - eh * 0.3, ew, eh * 0.18);
        g.fillStyle = '#7f1d1d';
        g.fillRect(cx - 12, cy - eh * 0.05, 24, 24);
        handPx(g, cx - ew * 0.56, cy + eh * 0.1, b.h * 0.16, { skin: '#f1c9a5', sleeve: '#0b0b12', ang: 0.6 });
        handPx(g, cx + ew * 0.56, cy + eh * 0.1, b.h * 0.16, { skin: '#f1c9a5', sleeve: '#0b0b12', ang: -0.6, flip: true });
      },
      { k: kIn, from: [W * 0.5, 0], pixel: PIX }
    );
  }

  CE.registerCine3D('ballon_dor', {
    phases: [180, 190, 180, 210, 200],
    music: 'epic',
    title: '🏆 A BOLA DE OURO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    tags: ['PLANO 1 • PARIS', 'PLANO 2 • O TAPETE VERMELHO', 'PLANO 3 • O ENVELOPE', 'PLANO 4 • A BOLA DE OURO', 'PLANO 5 • DE PÉ'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'Paris inteira espera um nome.', color: '#94a3b8' }],
      [{ from: 20, who: 'NARRADOR', text: 'Ninguém mais erra o seu nome.', color: '#94a3b8' }],
      [{ from: 10, who: 'APRESENTADORA', text: '"O envelope, por favor."', color: '#facc15' }],
      [{ from: 70, who: 'NARRADOR', text: 'O troféu mais pesado... pesa tão pouco.', color: '#94a3b8' }],
      [{ from: 20, who: 'NARRADOR', text: 'O nº 1 do mundo se levanta primeiro.', color: '#94a3b8' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const SUIT = { outfit: 'suit' };
      const AUD_L = [0.62, 0.52, 0.56];
      const host = CE.C3F_PRESENTER;
      const z0 = GALA.stage.z;
      galaSet(K, S, phase <= 1 ? 'paris' : phase === 2 || (phase === 3 && t < 40) ? 'env' : 'name');
      if (phase === 0) {
        // do fundo do saguão vestido de gala, por cima do tapete e da plateia, até o telão
        galaAudience(K, () => 0, AUD_L);
        const n = NOA_AT();
        K.actor('noa', { x: n[0], y: n[1] - 0.02, face: [n[0], 9], anim: 'sit', seat: 0.12, frame: 0, extra: SUIT, k: 0.9, light: AUD_L });
        K.actor(host, { id: 'host', x: 24.1, y: 9.85, z: z0, ang: Math.PI / 2, k: 0.9, light: [1.0, 0.88, 0.8] });
        const k = easeIO(t / 180);
        // (sai de cima do tapete, ao lado dos pilares, e chega na frente do palco)
        K.cam(mix([26.9, 1.5, 19.8], [25.3, 1.45, 13.9], k), mix([25.1, 0.6, 10.4], [25, 0.95, 9.1], k), lerp(54, 46, k));
        st.tv = Wp([25, 9.1, 1.05]);
      } else if (phase === 1) {
        // o tapete vermelho: você vindo de terno; a câmera recua na sua frente; os flashes
        const k = easeIO(t / 190);
        const y = lerp(20.2, 15.6, k);
        K.actor('you', { x: 27.3, y, ang: -Math.PI / 2, extra: SUIT, anim: 'run', frame: Math.floor(f / 7) * 2, k: 0.9, light: [1.12, 1.0, 0.86] });
        const L = extras(31, 16, { clothes: ['#020105', '#0b0b12', '#111827'] });
        GALA_PH.forEach(([x, py], i) => K.actor(L[i], { id: 'fot' + i, x, y: py, face: [27.3, y], frame: 0, k: 0.86, light: [0.5, 0.42, 0.45] }));
        galaAudience(K, () => 0, AUD_L);
        // (a câmera anda do lado leste, os pilares passam na frente; os fotógrafos do outro lado)
        K.cam([29.7 + K.noise(f * 0.6, 3) * 0.01, 0.78, y - 0.35], [27.0, 0.62, y - 0.15], 46);
        st.ph = GALA_PH.map(([x, py]) => Wp([x, py, 0.85]));
      } else if (phase === 2) {
        // a apresentadora no palco com o envelope; o telão pergunta
        K.actor(host, { id: 'host', x: 25, y: 9.85, z: z0, ang: Math.PI / 2, k: 0.9, light: [1.05, 0.9, 0.82] });
        K.actor('you', { x: 27.3, y: 11.2, face: [25, 9.8], extra: SUIT, k: 0.9, light: [0.85, 0.78, 0.72] });
        const k = easeIO(t / 180);
        K.cam([lerp(25.55, 25.35, k), lerp(0.6, 0.66, k), lerp(12.75, 12.45, k)], [25, lerp(0.82, 0.86, k), 9.6], lerp(44, 40, k));
      } else if (phase === 3) {
        // a Bola de Ouro: você no palco; o nome no telão; você ergue o troféu (câmera lenta)
        const A = remap(t, [[0, 0], [60, 60], [150, 84], [210, 144]]);
        K.actor(host, { id: 'host', x: 23.9, y: 9.85, z: z0, face: [25, 10], k: 0.9, light: [1.0, 0.88, 0.8] });
        K.actor('you', { x: 25, y: 9.9, z: z0, ang: Math.PI / 2, extra: SUIT, anim: A > 64 ? 'celebrate' : 'idle', frame: A > 64 ? 2 : 0, k: 0.9, light: [1.2, 1.08, 0.9] });
        const lift = ease(seg(A, 64, 84));
        K.sprite(goldTrophyPx(), { x: 25.02, y: 10.02, z: z0 + lerp(0.3, 0.86, lift), w: 0.2, h: 0.28, glow: true });
        // os dois canhões de luz cruzando em você
        [[23.2, -0.25], [26.8, 0.25]].forEach(([x, a]) => K.quad({ x, y: 10.0, z: 0, w: 1.4, h: 2.4, ang: Math.PI / 2 + a, img: beamCv('254,240,138'), em: true, color: '#ffffff', alpha: 0.32 }));
        const k = easeIO(t / 210);
        K.cam([lerp(27.3, 26.95, k), lerp(0.98, 0.88, k), lerp(13.1, 12.45, k)], [25, lerp(0.82, 0.95, k), 9.85], lerp(44, 40, k));
        st.cup = Wp([25.02, 10.02, z0 + lerp(0.44, 1.0, lift)]);
        st.tv = Wp([25, 9.1, 1.05]);
      } else {
        // de pé: o Noa levanta primeiro e aplaude; depois o saguão inteiro
        const n = NOA_AT();
        const noaUp = t > 18;
        K.actor('noa', { x: n[0], y: n[1] - 0.02, face: [25, 9.8], anim: noaUp ? 'clap' : 'sit', seat: noaUp ? undefined : 0.12, frame: noaUp ? undefined : 0, extra: SUIT, k: 0.9, light: [1.0, 0.9, 0.85] });
        galaAudience(K, (i) => (t > 100 + (i % 9) * 4 + (i > 18 ? 6 : 0) ? 1 : 0), [0.72, 0.62, 0.64]);
        K.actor('you', { x: 25, y: 9.9, z: z0, ang: Math.PI / 2, extra: SUIT, k: 0.9, light: [1.15, 1.05, 0.9] });
        K.sprite(goldTrophyPx(), { x: 25.02, y: 10.02, z: z0 + 0.3, w: 0.2, h: 0.28, glow: true });
        if (t < 92) {
          const k = easeIO(t / 92);
          K.cam([lerp(27.05, 26.9, k), 0.92, 9.5], [n[0] + 0.1, lerp(0.45, 0.6, k), n[1]], 44);
        } else {
          const k = easeIO(seg(t, 92, 200));
          K.cam(mix([26.95, 1.15, 18.9], [26.9, 1.52, 20.0], k), mix([25.4, 0.5, 11.0], [25.1, 0.5, 10.4], k), lerp(46, 52, k));
        }
        st.cup = Wp([25.02, 10.02, z0 + 0.44]);
        st.noa = Wp([n[0], n[1], 0.85]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      if (phase === 0) {
        if (st.tv) CE.cineGlow(ctx, st.tv.x, st.tv.y, 300, 'rgba(250,204,21,0.15)', 0.9);
        CE.cineBokeh(ctx, W, top, top + 180, t, 12, ['rgba(251,191,36,0.3)', 'rgba(254,240,138,0.25)'], 12);
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 22), '#000000');
        CE.finKicker(ctx, 40, top + 32, 'PARIS • A NOITE DA BOLA DE OURO', seg(t, 20, 70), '#facc15');
      } else if (phase === 1) {
        // os flashes dos fotógrafos (estrelinhas curtas em cima deles)
        (st.ph || []).forEach((p, i) => {
          const ph = (S.f + i * 37) % 47;
          if (p && ph < 5) {
            CE.finSparkle(ctx, p.x, p.y, 18, 1 - ph / 5);
            CE.cineFlash(ctx, W, H, 0.06 * (1 - ph / 5), '#ffffff');
          }
        });
        CE.cineBokeh(ctx, W, top, top + 160, t, 14, ['rgba(251,191,36,0.3)', 'rgba(254,240,138,0.25)'], 14);
      } else if (phase === 2) {
        CE.cineBokeh(ctx, W, top + 20, bot - 60, t, 14, ['rgba(251,191,36,0.25)', 'rgba(254,240,138,0.2)'], 16);
        if (t > 60) galaCutEnvelope(ctx, S, seg(t, 60, 69), seg(t, 60, 180));
        CE.cineSfx(S, 60, 'envelope', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        if (t >= 40) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, 40, 54)), '#fef9c3');
        if (st.tv && t >= 40) lampFlare(ctx, st.tv, 0.6, 160, '253,224,71');
        if (st.cup) {
          CE.cineGlow(ctx, st.cup.x, st.cup.y, 80, 'rgba(250,204,21,0.45)', 0.9);
          CE.finSparkle(ctx, st.cup.x + 12, st.cup.y - 10, 14, 0.6 + 0.4 * Math.sin(t * 0.12));
        }
        if (t >= 40) confetti(ctx, S, t - 40, 70, ['#facc15', '#fef3c7', '#ca8a04', '#fde68a']);
        CE.cineSfx(S, 40, 'bola', () => window.SFX?.goal?.(true));
      } else {
        if (st.cup) CE.cineGlow(ctx, st.cup.x, st.cup.y, 60, 'rgba(250,204,21,0.4)', 0.8);
        confetti(ctx, S, t + 170, 50, ['#facc15', '#fef3c7', '#ca8a04']);
        if (t >= 92) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 92, 100)), '#ffffff');
        CE.cineSfx(S, 20, 'palmas', () => window.SFX?.whoosh?.());
        CE.cineFlash(ctx, W, H, seg(t, 180, 200), '#000000');
      }
    }
  });

  // ==========================================================================
  // 6. O DESTINO DE CADA UM — os cenários de cada página (área vazia e o campo)
  // ==========================================================================
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

  // O destino de cada um, refeito: cada página é uma sequência de cenários com câmera viva;
  // o que era caixa de texto virou legenda; closes só em quadro de mangá em pixel art.
  // A última página é no campo do prédio (a conversa logo depois, bg 'school_sunset', é
  // filmada no campo): o teto aberto no fim de tarde.
  const EPI_CUTS2 = [[], [75, 150], [75, 150], [100], [], []];
  // céu pintado em pixel no teto aberto do campo: 'dawn' (o Rin) | 'sunset' (você)
  const roofSkyCv = (kind) =>
    canvas('roofsky|' + kind, 64, 64, (g, w, h) => {
      const cols = kind === 'dawn' ? ['#0b1446', '#312e81', '#7c3aed', '#f472b6', '#fb923c'] : ['#1e1b4b', '#7c2d12', '#c2410c', '#f97316', '#fdba74'];
      cols.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(0, Math.floor((i * h) / cols.length), w, Math.ceil(h / cols.length) + 1);
      });
      g.fillStyle = kind === 'dawn' ? '#fde68a' : '#fef3c7';
      g.fillRect(28, h - 12, 8, 8);
      g.fillRect(27, h - 11, 10, 6);
    });
  const openRoof = (K, kind) => K.floor({ x0: 44.5, y0: 5.5, x1: 61.5, y1: 23.5, z: 6.9, img: roofSkyCv(kind), color: '#ffffff', em: true });
  // luz quente de amanhecer/fim de tarde vindo de cima (o teto aberto)
  const warmGrade = (ctx, S, a) => {
    const gr = ctx.createLinearGradient(0, S.top, 0, S.bot);
    gr.addColorStop(0, `rgba(249,115,22,${a})`);
    gr.addColorStop(0.6, `rgba(244,114,182,${a * 0.35})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, S.top, S.W, S.bot - S.top);
  };
  // a sua chuteira na bola velha (fim de tarde), a do Rin no amanhecer, o pé do garoto
  function epiCutBoot(ctx, S, kIn, q, o) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      o.left ? [[18, top + 22], [W * 0.44, top + 14], [W * 0.4, bot - 20], [18, bot - 30]] : [[W * 0.56, top + 14], [W - 18, top + 22], [W - 18, bot - 30], [W * 0.6, bot - 20]],
      (b, g) => {
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, o.sky[0]);
        gr.addColorStop(1, o.sky[1]);
        g.fillStyle = gr;
        g.fillRect(b.x, b.y, b.w, b.h);
        const gy = b.y + b.h * 0.76;
        g.fillStyle = o.ground;
        g.fillRect(b.x, gy, b.w, b.h);
        if (o.lines) CA.speedLines(g, o.left ? 0.2 : Math.PI - 0.2, S.W, S.H, { color: 'rgba(255,255,255,0.5)', n: 30, t: q * 70, speed: 30, thick: 4 });
        const e = easeIO(q);
        const bx = b.x + b.w * 0.55 + b.ox;
        const by = gy - b.h * (o.juggle ? 0.12 + Math.abs(Math.sin(q * Math.PI * 3)) * 0.3 : 0.08);
        CA.ball(g, bx, by, b.h * 0.1, { rot: q * 6 });
        CA.boot(g, b.x + b.w * lerp(o.kick ? 0.15 : 0.4, 0.4, e) + b.ox, gy - b.h * 0.02 - (o.juggle ? Math.max(0, Math.sin(q * Math.PI * 3)) * b.h * 0.05 : 0), b.h * 0.12, { sock: o.sock, sock2: o.sock2, boot: o.boot, skin: o.skin, ang: o.kick ? lerp(0.9, -0.2, e) : 0.05 });
      },
      { k: kIn, from: [o.left ? -W * 0.45 : W * 0.45, 0], pixel: PIX }
    );
  }

  CE.registerCine3D('epilogue_destinies', {
    phases: [220, 220, 220, 210, 200, 210],
    music: 'promise',
    title: '📖 O DESTINO DE CADA UM',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    tags: ['PÁGINA 1 • RIN ITOSHI', 'PÁGINA 2 • BACHIRA • NAGI & REO • CHIGIRI', 'PÁGINA 3 • KUNIGAMI • SAE • SHIDOU', 'PÁGINA 4 • KAISER & NESS • EGO', 'PÁGINA 5 • DO OUTRO LADO DO MUNDO', 'PÁGINA 6 • E VOCÊ'],
    get subs() {
      const me = CE.cinePlayerName();
      return [
        [
          { from: 14, to: 104, who: 'NARRADOR', text: 'Depois da Copa, cada egoísta seguiu o próprio caminho.', color: '#94a3b8' },
          { from: 112, who: 'RIN ITOSHI', text: 'Todo dia, antes do sol nascer. Sozinho. Ainda caçando o número 1.', color: '#2dd4bf' }
        ],
        [
          { from: 10, to: 74, who: 'MEGURU BACHIRA', text: 'Voltou pro bairro. Agora o monstro dele tem alunos.', color: '#facc15' },
          { from: 80, to: 149, who: 'NAGI & REO', text: '"Mais uma." (Era a décima. O Reo pagou o jogo novo.)', color: '#c084fc' },
          { from: 155, who: 'HYOMA CHIGIRI', text: 'Ninguém alcança. Nem a lesão.', color: '#fb7185' }
        ],
        [
          { from: 10, to: 74, who: 'RENSUKE KUNIGAMI', text: 'Voltou do fundo do poço. Treina em dobro: o herói agora é ele mesmo.', color: '#fb923c' },
          { from: 80, to: 149, who: 'SAE ITOSHI', text: 'Em Madri. Ainda procura alguém que mereça o passe dele. Achou um.', color: '#f472b6' },
          { from: 155, who: 'RYUSEI SHIDOU', text: 'Continua explodindo. O PXG já trocou a rede três vezes.', color: '#f472b6' }
        ],
        [
          { from: 10, to: 99, who: 'KAISER & NESS', text: '"Da próxima vez, a coroa volta pra Alemanha." Eles também não esqueceram.', color: '#60a5fa' },
          { from: 106, who: 'JINPACHI EGO', text: 'No escuro, de novo. Já está assistindo a próxima geração.', color: '#2dd4bf' }
        ],
        [
          { from: 10, to: 70, who: 'NARRADOR', text: 'E, do outro lado do mundo...', color: '#94a3b8' },
          { from: 74, to: 136, who: 'BRASIL', text: 'Um campinho de terra. Um garoto de 14 anos. Fome nos olhos.', color: '#4ade80' },
          { from: 140, who: '???', text: '"Hehehe... esse vai ficar caro."', color: '#f87171' }
        ],
        [
          { from: 24, to: 120, who: 'NARRADOR', text: '...você voltou pro lugar onde tudo começou.', color: '#94a3b8' },
          { from: 126, who: me, text: 'Campeão do mundo. Bola de Ouro. Número 1. E continua com fome.', color: '#00f5d4' }
        ]
      ];
    },
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const cuts = EPI_CUTS2[phase];
      const part = cuts.filter((c) => t >= c).length;
      const lt = part ? t - cuts[part - 1] : t;
      const pdur = (part < cuts.length ? cuts[part] : S.dur) - (part ? cuts[part - 1] : 0);
      const k = easeIO(lt / pdur);
      if (phase === 0) {
        // o Rin sozinho no campo do Blue Lock ao amanhecer, chutando bola atrás de bola
        K.sky('#0b1446', '#f97316', 0.05);
        K.fog('#3b1d3a', 0.02);
        K.expo(1.0);
        openRoof(K, 'dawn');
        const cyc = t % 72;
        const kick = cyc >= 40;
        K.actor('rin', { x: 53.2, y: 10.6, ang: -Math.PI / 2, extra: KIT_RIN, anim: kick ? 'shoot' : cyc > 22 ? 'windup' : 'idle', frame: kick ? 1 : 0, opts: kick ? { animTime: (cyc - 40) * 2 } : undefined, k: 0.9, light: [1.15, 0.86, 0.72] });
        const bq = kick ? clamp((cyc - 40) / 22) : 0;
        K.ball(lerp(53.3, 53.6, bq), lerp(10.3, 6.5, bq), 0.06 + Math.sin(bq * Math.PI) * 0.5 + bq * 0.25);
        [[52.3, 6.3], [53.4, 6.25], [52.9, 6.35], [53.7, 6.3], [54.4, 9.9], [51.6, 10.8]].forEach(([x, y]) => K.ball(x, y, 0.06));
        fieldShadows(K, 53.2, 10.6, 0.2);
        if (t < 110) {
          const kk = easeIO(t / 110);
          K.cam([lerp(57.2, 56.4, kk), lerp(1.3, 0.62, kk), lerp(13.4, 12.4, kk)], [53.0, 0.55, 9.0], lerp(54, 46, kk));
        } else {
          const kk = easeIO((t - 110) / 110);
          K.cam([lerp(51.1, 51.4, kk), 0.5, lerp(12.6, 12.3, kk)], [53.4, 0.6, 9.6], 46);
        }
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
          const bx = 86 + Math.sin(lt * 0.1) * 0.6;
          K.actor('bachira', { x: 86, y: 15.6, face: [bx, 15.9], anim: 'run', frame: Math.floor(f / 4), extra: casual('#facc15') });
          K.actor(kid(0), { id: 'k0', x: 84.6, y: 16.6, face: [86, 15.6], frame: 0, k: 0.66 });
          K.actor(kid(1), { id: 'k1', x: 87.4, y: 16.3, face: [86, 15.6], anim: 'call_pass', k: 0.62 });
          K.actor(kid(2), { id: 'k2', x: 86.9, y: 17.3, face: [86, 15.6], anim: 'celebrate', k: 0.7 });
          K.ball(bx, 15.9, Math.abs(Math.sin(lt * 0.2)) * 0.3 + 0.06);
          K.cam([lerp(87.6, 86.9, k), lerp(0.9, 0.72, k), lerp(19.4, 18.9, k)], [86.1, 0.55, 15.6], 48);
        } else if (part === 1) {
          // a sala de jogos: o Nagi largado no sofá, o Reo de controle na mão, a TV acesa
          K.sky('#03050d', '#03050d', 0);
          K.fog('#03050d', 0.05);
          K.ambient('#5a78c8');
          K.floor({ x0: 82, y0: 12, x1: 90, y1: 20, color: '#0b1120' });
          const tv = live('epi_tv', 64, 36, S, 10, (g, w, h) => {
            g.fillStyle = lt % 90 < 70 ? '#1d4ed8' : '#7c3aed';
            g.fillRect(0, 0, w, h);
            px35(g, lt % 90 < 70 ? 'WIN' : 'GG', w / 2, 10, '#f8fafc', 3, 'center');
          });
          K.box({ x0: 84.7, y0: 13.0, x1: 87.3, y1: 13.15, z0: 0.35, z1: 1.35, color: '#0b1120' });
          pic(K, { x: 86, y: 13.16, z: 0.42, w: 2.4, h: 0.86, ang: Math.PI / 2, img: tv.cv, dirty: tv.dirty, color: '#ffffff', em: true });
          K.box({ x0: 84.6, y0: 15.6, x1: 87.0, y1: 16.3, z0: 0, z1: 0.26, color: '#1e1b4b', top: '#312e81' });
          K.box({ x0: 84.6, y0: 16.2, x1: 87.0, y1: 16.4, z0: 0, z1: 0.55, color: '#1e1b4b', top: '#312e81' });
          K.actor('nagi', { x: 85.4, y: 15.95, ang: -Math.PI / 2, anim: 'sit_down', seat: 0.2, extra: casual('#cbd5e1'), light: [0.55, 0.65, 1.0] });
          K.actor('reo', { x: 86.3, y: 15.95, ang: -Math.PI / 2, anim: 'sit', seat: 0.2, extra: casual('#6d28d9'), light: [0.6, 0.7, 1.05] });
          K.floor({ x0: 84.4, y0: 13.2, x1: 87.6, y1: 16.2, z: 0.006, img: glowCv('rgba(59,130,246,0.5)'), color: '#ffffff', em: true, alpha: 0.999 });
          // (de frente para os dois, do lado da TV: o rosto aceso pela tela)
          K.cam([lerp(88.9, 88.6, k), lerp(0.82, 0.76, k), lerp(13.9, 14.2, k)], [85.85, 0.38, 15.95], 46);
          st.tv = Wp([86, 13.2, 0.85]);
        } else {
          // o Chigiri: ninguém alcança (a câmera correndo do lado dele)
          K.sky('#0f2a4a', '#38bdf8', 0);
          K.fog('#0f2a4a', 0.02);
          K.expo(1.05);
          const x = lerp(47.5, 58.5, lt / pdur);
          K.actor('chigiri', { x, y: 15.5, ang: 0, kit: 'japan', anim: 'run', frame: f, light: [1.15, 1.1, 1.1] });
          K.ball(x + 0.45, 15.55, 0.05 + Math.abs(Math.sin(f * 0.3)) * 0.06);
          K.cam([x - 0.4, 0.5, 18.1], [x + 0.35, 0.5, 15.5], 46);
        }
      } else if (phase === 2) {
        if (part === 0) {
          // o Kunigami treinando à noite, sozinho, debaixo do poste
          K.sky('#04070f', '#0d1f14', 0.4);
          K.fog('#04070f', 0.04);
          K.ambient('#3a4a5a');
          K.floor({ x0: 80, y0: 10, x1: 94, y1: 24, color: '#0d1f14' });
          lampPost(K, 85.3, 15.2);
          miniGoal(K, 90.4, 15.6, 1.6, 0.8, 'y', '#cbd5e1');
          const cyc = lt % 50;
          const shoot = cyc >= 26;
          K.actor('kunigami', { x: 86.2, y: 15.6, ang: 0, anim: shoot ? 'shoot' : 'windup', frame: 1, opts: shoot ? { animTime: (cyc - 26) * 2 } : undefined, light: [1.2, 1.0, 0.75] });
          const bk = shoot ? (cyc - 26) / 24 : 0;
          K.ball(86.55 + bk * 3.8, 15.6, 0.08 + Math.sin(bk * Math.PI) * 0.5);
          K.cam([lerp(84.4, 84.8, k), 0.66, lerp(18.6, 18.3, k)], [86.6, 0.75, 15.5], 46);
          st.lamp = Wp([85.76, 2.33, 15.2]);
        } else if (part === 1) {
          // o Sae em Madri: de branco, a bola no pé, a luz do estádio
          K.sky('#0b1126', '#1c1430', 0.3);
          K.expo(1.0);
          K.actor('sae', { x: 53, y: 12.2, face: [53, 6], anim: 'run', frame: Math.floor(f / 3), extra: { jerseyPrimary: '#f8fafc', jerseySecondary: '#facc15' }, light: [1.15, 1.05, 1.1] });
          K.ball(53.05, 11.9, 0.06);
          K.cam([lerp(55.4, 55.1, k), 0.5, lerp(13.2, 12.8, k)], [53, 0.6, 11.9], 44);
        } else {
          // o Shidou: a bicicleta no ar, a rede de novo
          K.sky('#2a0a24', '#0a0410', 0.3);
          K.expo(1.0);
          const up = Math.sin(seg(lt, 0, 50) * Math.PI);
          K.actor('shidou', { x: 53, y: 8.2, z: up * 0.55, ang: Math.PI / 2, anim: 'bicycle', frame: 1, opts: { animTime: lt }, light: [1.25, 0.9, 1.1] });
          const bq = seg(lt, 26, 50);
          K.ball(lerp(53.1, 53.4, bq), lerp(8.0, 6.5, bq), lerp(1.0, 0.75, bq));
          K.cam([lerp(55.3, 55.1, k), 0.42, lerp(10.6, 10.3, k)], [53.2, 0.7, 7.8], 48);
          st.net = Wp([53.4, 6.5, 0.75]);
          st.hit = lt >= 50;
          st.lt = lt;
        }
      } else if (phase === 3) {
        if (part === 0) {
          // Kaiser e Ness na neve
          K.sky('#0b1a3a', '#1e3a5f', 0.2);
          K.fog('#1e3a5f', 0.04);
          K.ambient('#9ab0d8');
          K.floor({ x0: 78, y0: 8, x1: 96, y1: 26, color: '#e2e8f0' });
          for (let i = 0; i < 8; i++) K.box({ x0: 80 + i * 2.2, y0: 11 + (i % 3) * 0.6, x1: 81.2 + i * 2.2, y1: 11.8 + (i % 3) * 0.6, z0: 0, z1: 0.8 + (i % 4) * 0.5, color: '#132a52', top: '#e2e8f0' });
          K.actor('ness', { x: 85.4, y: 15.4, face: [86.6, 15.9], k: 0.88, light: [0.75, 0.8, 1.0] });
          K.actor('kaiser', { x: 86.6, y: 15.9, face: [86, 12], k: 0.92, light: [0.95, 1.0, 1.15] });
          K.cam([lerp(86.9, 86.4, k), lerp(0.7, 0.62, k), lerp(18.8, 18.5, k)], [86.1, 0.62, 15.6], 44);
        } else {
          // o Ego no escuro, de costas, na sala dele: a parede de monitores com a molecada
          const eye = [lerp(87.4, 86.9, k), lerp(0.95, 0.9, k), lerp(18.6, 18.0, k)];
          K.cam(eye, [86, 1.2, 13.2], 48);
          egoRoom(K, S.t, eye);
          const wl = live('epi_wall', CW.w, CW.h, S, 3, (g, w, h) => {
            g.fillStyle = '#01040a';
            g.fillRect(0, 0, w, h);
            for (let i = 0; i < 27; i++) {
              const kd = kid(i % 4, { name: 'kid' + i, skinColor: ['#8d5524', '#c68642', '#f1c27d', '#6b4423', '#e0ac69'][i % 5], hairColor: ['#1c1917', '#3f2a1d', '#0f172a', '#facc15', '#7c2d12'][(i * 3) % 5], hairStyle: ['soft_side', 'spiky_tall', 'short_sharp', 'soft_curls', 'buzz_tall'][(i * 7) % 5] });
              convTile(g, i, 'port', ['BRA', 'JPN', 'ESP', 'ARG', 'FRA', 'ENG', 'GER', 'NGA', 'ITA'][i % 9], portrait('kid|' + i, kd), i === (Math.floor(lt / 8) % 27) ? 0.5 : 0);
            }
            g.fillStyle = '#020a14';
            g.fillRect(0, h - 44, w, 44);
            px35(g, 'PROXIMA GERACAO', w / 2, h - 30, '#00f5d4', 2, 'center');
          });
          pic(K, { x: EGO_X, y: 13.025, z: 0.02, w: CW.uw, h: CW.uh, ang: Math.PI / 2, img: wl.cv, dirty: wl.dirty, em: true, color: '#ffffff' });
          K.actor('EGO', { x: EGO_P[0] - 0.3, y: 15.85, ang: -Math.PI / 2, k: 0.95, light: [0.4, 0.62, 0.7] });
        }
      } else if (phase === 4) {
        // Brasil: o campinho de terra no fim de tarde; o Fox no escuro, de lado
        K.sky('#3b0d4a', '#fdba74', 0);
        K.fog('#7c2d12', 0.02);
        K.ambient('#f0a070');
        K.floor({ x0: 78, y0: 6, x1: 96, y1: 26, color: '#9a4a1f' });
        pic(K, { x: 86, y: 6.5, z: -0.2, w: 22, h: 5.5, ang: Math.PI / 2, img: favelaCv(), color: '#ffffff', light: [0.95, 0.75, 0.6] });
        miniGoal(K, 84.2, 11.6, 1.5, 0.7, 'x', '#e7e5e4');
        const jb = Math.abs(Math.sin(t * 0.09));
        K.actor(kid(0, { name: 'Garoto do campinho', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a' }), { id: 'garoto', x: 86.4, y: 13.4, ang: Math.PI / 2, anim: 'idle', k: 0.8, light: [1.1, 0.88, 0.72] });
        K.ball(86.6, 13.55, 0.08 + jb * 0.55);
        K.actor(CE.getSpeakerCharData('FOX'), { id: 'fox', x: 88.4, y: 15.3, face: [86.4, 13.4], k: 0.95, light: [0.1, 0.07, 0.07] });
        K.cam([lerp(87.1, 86.7, easeIO(t / 200)), lerp(0.75, 0.66, easeIO(t / 200)), lerp(18.3, 17.8, easeIO(t / 200))], [86.9, 0.55, 13.8], 46);
        st.fox = Wp([88.4, 15.3, 0.62]);
      } else {
        // e você: o campo, o teto aberto no fim de tarde, uma bola velha; o Tada chega lá atrás
        K.sky('#1e1b4b', '#f97316', 0);
        K.fog('#3b1d2b', 0.02);
        K.expo(1.02);
        openRoof(K, 'sunset');
        const walk = ease(seg(t, 0, 120));
        const yp = [lerp(52.4, 53, walk), lerp(16.2, 14.6, walk)];
        K.actor('you', { x: yp[0], y: yp[1], face: [53, 6.6], anim: t < 120 ? 'run' : 'idle', frame: Math.floor(f / 5), extra: casual('#1e3a8a'), light: [1.08, 0.88, 0.72] });
        K.ball(yp[0] + 0.06, yp[1] - 0.3, 0.06, { light: [0.85, 0.7, 0.55] });
        if (t > 140) K.actor('tada', { x: 55.8, y: 19.4, face: yp, anim: 'call_pass', extra: casual('#b45309'), light: [1.0, 0.82, 0.7] });
        fieldShadows(K, yp[0], yp[1], 0.24);
        const kk = easeIO(t / 210);
        K.cam(mix([54.8, 0.45, 18.6], [55.6, 1.5, 19.6], kk), mix([yp[0], 0.5, yp[1]], [53.2, 2.2, 11.0], kk), lerp(44, 56, kk));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stScreen(K);
      const cuts = EPI_CUTS2[phase];
      // corte seco entre os cenários da página (um clarão curto)
      cuts.forEach((c) => t >= c && CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, c, c + 6)), '#ffffff'));
      if (phase === 0) {
        warmGrade(ctx, S, 0.22);
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 20), '#000000');
        CE.cineDust(ctx, W, H, t, 24, 'rgba(253,186,116,0.55)', 13);
        CE.finKicker(ctx, 40, top + 32, 'EPÍLOGO • O DESTINO DE CADA UM', seg(t, 16, 70), '#00f5d4');
        if (t > 120) epiCutBoot(ctx, S, seg(t, 120, 129), seg(t, 120, 210), { left: false, kick: true, lines: true, sky: ['#7c3aed', '#fb923c'], ground: '#166534', sock: '#0f766e', sock2: '#020617', boot: '#0f172a' });
      } else if (phase === 1) {
        if (t >= 75 && t < 150 && st.tv) CE.cineGlow(ctx, st.tv.x, st.tv.y, 160, 'rgba(59,130,246,0.3)', 0.9);
        if (t >= 150) {
          CE.drawSpeedLines(ctx, W, H, 'rgba(255,255,255,0.5)', 0.22);
          CE.cineDust(ctx, W, H, t * 6, 20, 'rgba(226,232,240,0.6)', 11);
        }
      } else if (phase === 2) {
        if (t < 75 && st.lamp) lampFlare(ctx, st.lamp, 0.8, 80, '254,240,138');
        if (t >= 75 && t < 150) CE.cineBokeh(ctx, W, top, top + 200, t, 12, ['rgba(254,240,138,0.5)', 'rgba(255,255,255,0.4)'], 18);
        if (t >= 150 && st.hit && st.net) {
          const q = seg(st.lt, 50, 70);
          CE.cineGlow(ctx, st.net.x, st.net.y, 120, 'rgba(244,114,182,0.5)', 1 - q);
          CE.cineImpactText(ctx, 'BOOM!', W * 0.66, bot - 110, 60, '#f9a8d4', seg(st.lt, 50, 58), 0, -0.12);
        }
      } else if (phase === 3) {
        if (t < 100) {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 70; i++) {
            const x = (rnd(i, 90) * W + Math.sin(t * 0.03 + i) * 20) % W;
            const y = top + ((rnd(i, 91) * (bot - top) + t * (0.8 + rnd(i, 92)) * 1.6) % (bot - top));
            ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 4, 4);
          }
        } else CE.cineDust(ctx, W, H, t, 20, 'rgba(153,246,228,0.5)', 5);
      } else if (phase === 4) {
        CE.cineDust(ctx, W, H, t, 30, 'rgba(253,186,116,0.6)', 13);
        // o Fox no escuro: só a brasa do charuto e a fumaça
        if (st.fox) {
          const cx = st.fox.x + 14;
          const cy = st.fox.y + 6;
          CE.cineGlow(ctx, cx, cy, 14, 'rgba(251,146,60,0.95)', 0.7 + 0.3 * Math.sin(t * 0.2));
          ctx.fillStyle = 'rgba(214,211,209,0.22)';
          for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(cx + Math.sin(i * 0.6 - t * 0.06) * (4 + i * 1.6)), Math.round(cy - 8 - i * 9), 6, 6);
        }
        if (t > 74 && t < 140) epiCutBoot(ctx, S, seg(t, 74, 83), seg(t, 74, 140), { left: true, juggle: true, sky: ['#7c2d12', '#fdba74'], ground: '#9a4a1f', sock: '#16a34a', sock2: '#facc15', boot: '#e7e5e4' });
      } else {
        warmGrade(ctx, S, 0.26);
        CE.cineDust(ctx, W, H, t, 24, 'rgba(254,240,138,0.55)', 17);
        if (t > 60 && t < 140) epiCutBoot(ctx, S, seg(t, 60, 69), seg(t, 60, 140), { left: false, sky: ['#c2410c', '#fdba74'], ground: '#166534', sock: '#1e3a8a', sock2: '#f8fafc', boot: '#475569' });
        CE.cineFlash(ctx, W, H, seg(t, 192, 210), '#000000');
      }
    }
  });

  // ==========================================================================
  // 7. O GOL DOS QUATRO EGOS (wc_final_goal) — a final da Copa na Catedral, refeita como
  // cinema no padrão do gol da Sub-20. 90+5', 2 x 2: o Sae segura a bola com três em cima,
  // o Rin dispara gritando e arrasta o Hugo (a isca), o Sae dá a trivela que ninguém viu,
  // a bola sobe e faz a curva; a lembrança do colégio (passar ou chutar?); o Loki vem na
  // Velocidade Divina; o tempo para (metavisão: você vê o ângulo); de primeira, um instante
  // antes do carrinho do Loki; a bola entra no ângulo, a rede estufa, o apito final; os
  // quatro egos. Câmera viva, duas câmeras lentas com rampa, um quadro de impacto.
  // O Japão ataca o gol norte (y 6,6). P(u, d, z): u = de lado, d = distância da linha.
  // ==========================================================================
  const YOU_C = '#00f5d4';
  const SAE_C = '#f9a8d4';
  const RIN_C = '#2dd4bf';
  const LOKI_C = '#facc15';
  const HUGO_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const KIT_GK_JP = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
  const KIT_GK_FR = { jerseyPrimary: '#22c55e', jerseySecondary: '#052e16' };
  const KIT_SCHOOL = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  // (você com o SEU número: sem ele o boneco saía com a 10, a mesma do Sae)
  const myNumber = () => window.App?.state?.profile?.number || 11;
  const WC = {
    you: (o) => ['you', Object.assign({ kit: 'japan', extra: { number: myNumber() } }, o)],
    sae: (o) => ['sae', Object.assign({ kit: 'japan' }, o)],
    rin: (o) => ['rin', Object.assign({ kit: 'japan', extra: { angry: true } }, o)],
    shidou: (o) => ['shidou', Object.assign({ kit: 'japan' }, o)],
    gaga: (o) => ['gagamaru', Object.assign({ extra: KIT_GK_JP }, o)],
    loki: (o) => ['loki', Object.assign({ kit: 'france' }, o)],
    hugo: (o) => ['hugo', Object.assign({ kit: 'france' }, o)],
    charles: (o) => ['charles', Object.assign({ kit: 'france' }, o)],
    mf: (o) => ['gen_france_mf', Object.assign({ kit: 'france' }, o)],
    df: (o) => ['gen_france_df', Object.assign({ kit: 'france' }, o)],
    gk: (o) => ['gk_france', Object.assign({ extra: KIT_GK_FR }, o)]
  };
  const GX = 53;
  const GY = 6.6;
  const P = (u, d, z = 0) => [GX + u, GY + d, z];
  const wa = (K, who, p, o = {}) => {
    const [id, oo] = WC[who](o);
    return K.actor(id, Object.assign(oo, { x: p[0], y: p[1], z: (o.z || 0) + (p[2] || 0) }));
  };
  // o passe (trivela do Sae): tau = quadros de ação desde o toque; chega no seu pé em PASS_T
  const PASS_T = 150;
  const PA = P(0.33, 7.92, 0.05);
  const PC = P(0.15, 5.9);
  const PB = P(-1.88, 4.22, 0.36);
  const pass = (tau) => {
    const k = clamp(tau / PASS_T);
    const a = (1 - k) * (1 - k);
    const b = 2 * k * (1 - k);
    const c = k * k;
    return [a * PA[0] + b * PC[0] + c * PB[0], a * PA[1] + b * PC[1] + c * PB[1], lerp(0.05, 0.36, k) + 1.5 * Math.sin(k * Math.PI) * (1 - 0.15 * k)];
  };
  // o chute: do seu pé até o ângulo (canto alto da direita); s = quadros desde o chute
  const ANG = P(0.84, 0.02, 0.86);
  const SHOT_T = 40;
  const shot = (s) => {
    const q = clamp(s / SHOT_T);
    const e = 1 - Math.pow(1 - q, 1.4);
    return [lerp(PB[0], ANG[0], e), lerp(PB[1], ANG[1], e), lerp(PB[2], ANG[2], e) + Math.sin(q * Math.PI) * 0.28];
  };
  const KICK_AT = P(-2.02, 4.42);
  // onde você comemora (quina da área) e onde o Loki ficou depois do carrinho
  const WC_CEL = P(-3.0, 2.5);
  const WC_LOKI = P(-1.72, 4.3);
  const GK0 = P(-0.28, 0.5);
  // o Sae conduzindo (d cai de 9,4 até 8,2 ao longo dos planos 1, 2 e 4)
  const saeAt = (d) => P(0.42 - (9.4 - d) * 0.06, d);
  const saeBall = (sp, f) => [sp[0] - 0.05, sp[1] - 0.3, 0.05 + Math.abs(Math.sin(f * 0.25)) * 0.02];
  // o colégio (lembrança): montado na área vazia
  const schoolCv = () =>
    canvas('school_px', 256, 80, (g) => {
      g.scale(0.25, 0.25);
      g.fillStyle = '#cdbd9c';
      g.fillRect(260, 90, 520, 230);
      g.fillStyle = '#7c6a4c';
      g.fillRect(250, 80, 540, 14);
      g.fillStyle = '#e7dcc4';
      g.fillRect(470, 40, 100, 60);
      g.fillStyle = '#334155';
      g.fillRect(504, 54, 32, 32);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
        g.fillStyle = rnd(r * 10 + c, 5) < 0.3 ? '#fdba74' : '#5b6b84';
        g.fillRect(280 + c * 50, 120 + r * 60, 32, 30);
      }
      g.fillStyle = '#3f6212';
      for (let i = 0; i < 18; i++) g.fillRect(i * 60 + (i % 2) * 20 - 40, 290 - (i % 3) * 14, 80 + (i % 3) * 20, 60);
    });

  const WC_PH = [180, 150, 160, 150, 120, 120, 120, 140, 150, 100, 140, 180, 240];
  // planos 4 (o passe) e 9 (o chute): câmera lenta com rampa
  const WC_P4 = [[0, 0], [50, 50], [110, 74], [150, 114]];
  const WC_STRIKE = 70;
  const WC_P9 = [[0, 0], [70, 28], [96, 31], [150, 84]];
  const WC_KA = 31; // (tempo de ação do chute no plano 9)
  const WC_KT = 96; // (quadro real do chute no plano 9)

  function wcScene(K, S) {
    const { t, phase, f } = S;
    const st = (K.st = {});
    K.sky('#05030c', '#3a2c5c', 0.25);
    K.fog('#0b0812', 0.02);
    K.expo(1.02);
    const fr = Math.floor(f * 0.5);
    if (phase === 0) {
      // A CATEDRAL: a grua desce da arquibancada até o lance; o Sae com a bola no meio
      const k = easeIO(seg(t, 0, 180));
      const sp = saeAt(lerp(9.4, 9.0, t / 180));
      wa(K, 'sae', sp, { id: 'sae', face: P(0.2, 0), anim: 'run', frame: Math.floor(f / 3) });
      ballAt(K, saeBall(sp, f));
      wa(K, 'charles', P(lerp(0.4, -0.6, k), lerp(10.6, 10.0, k)), { id: 'ch', face: sp, anim: 'run', frame: fr + 2 });
      wa(K, 'mf', P(lerp(-0.4, -0.1, k), lerp(6.9, 7.2, k)), { id: 'mf', face: sp, anim: 'run', frame: fr + 5 });
      wa(K, 'df', P(lerp(-1.6, -1.1, k), lerp(8.3, 8.5, k)), { id: 'df', face: sp, anim: 'run', frame: fr + 7 });
      wa(K, 'rin', P(lerp(1.4, 1.7, k), lerp(7.6, 6.9, k)), { id: 'rin', face: P(2.5, 3), anim: 'run', frame: fr + 1 });
      wa(K, 'hugo', P(lerp(1.75, 2.0, k), lerp(8.0, 7.35, k)), { id: 'hugo', face: P(2.5, 3), anim: 'run', frame: fr + 3 });
      wa(K, 'you', P(lerp(-3.0, -2.85, k), lerp(7.9, 7.2, k)), { id: 'you', face: P(-2.6, 3), anim: 'run', frame: fr + 4 });
      wa(K, 'shidou', P(-0.9, lerp(7.4, 6.7, k)), { id: 'shi', face: P(-0.5, 2), anim: 'run', frame: fr + 6 });
      wa(K, 'loki', P(lerp(2.6, 2.4, k), lerp(10.4, 9.9, k)), { id: 'loki', face: sp, anim: 'run', frame: fr + 8 });
      wa(K, 'gk', GK0, { id: 'gk', face: P(0, 9), frame: 0 });
      [sp, P(-2.9, 7.5), P(1.6, 7.2)].forEach((p) => fieldShadows(K, p[0], p[1], 0.22));
      cam3(K, mix(P(3.9, 16.0, 6.3), P(2.3, 12.4, 1.45), k), mix(P(0.3, 6.0, 0.3), P(-0.3, 7.9, 0.42), k), lerp(62, 48, k));
      st.you = Wp(P(-2.9, 7.4, 1.05));
    } else if (phase === 1) {
      // O REI COM A BOLA: de lado, na altura da bola, a câmera acompanhando; três em cima
      const k = t / 150;
      const sp = saeAt(lerp(9.0, 8.55, k));
      const look = t > 100;
      wa(K, 'sae', sp, { id: 'sae', face: look ? P(-1.6, 6) : P(0.3, 0), anim: look ? 'idle' : 'run', frame: look ? 0 : Math.floor(f / 3), light: [1.12, 1.02, 1.08] });
      ballAt(K, saeBall(sp, f));
      // (os três ficam do lado de lá do Sae: perto da câmera viravam bonecos enormes)
      const pk = easeIO(k);
      wa(K, 'mf', P(lerp(0.0, 0.2, pk), lerp(7.2, 7.75, pk)), { id: 'mf', face: sp, anim: 'run', frame: fr + 5 });
      wa(K, 'charles', P(lerp(-0.7, -0.3, pk), lerp(10.0, 9.3, pk)), { id: 'ch', face: sp, anim: 'run', frame: fr + 2 });
      wa(K, 'df', P(lerp(-1.0, -0.42, pk), lerp(8.6, 8.4, pk)), { id: 'df', face: sp, anim: 'run', frame: fr + 7 });
      fieldShadows(K, sp[0], sp[1], 0.24);
      const push = easeIO(seg(t, 80, 150));
      cam3(K, shake(K, P(0.42 + lerp(2.55, 2.3, push), sp[1] - GY + 0.25, lerp(0.32, 0.42, push)), f, 0.008), P(0.35, sp[1] - GY - 0.1, 0.46), lerp(44, 40, push));
    } else if (phase === 2) {
      // A ISCA: o Rin dispara gritando, o Hugo colado nas costas; a câmera recuando na frente
      const k = t / 160;
      const rp = P(lerp(1.7, 2.45, k), lerp(6.9, 4.3, k));
      wa(K, 'rin', rp, { id: 'rin', face: P(2.6, 0), anim: 'run', frame: fr + 1, opts: { expr: 'shout' } });
      const hp = P(lerp(1.95, 2.72, k), lerp(7.35, 4.85, k));
      wa(K, 'hugo', hp, { id: 'hugo', face: P(2.6, 0), anim: 'run', frame: fr + 3, opts: { expr: t > 100 ? 'laugh' : undefined } });
      // lá atrás: o Sae com os três em cima
      const sp = saeAt(8.55);
      wa(K, 'sae', sp, { id: 'sae', face: P(-1.6, 6), frame: 0 });
      ballAt(K, saeBall(sp, f));
      wa(K, 'mf', P(0.2, 7.75), { id: 'mf', face: sp, anim: 'run', frame: fr + 5 });
      wa(K, 'charles', P(-0.3, 9.3), { id: 'ch', face: sp, anim: 'run', frame: fr + 2 });
      wa(K, 'df', P(-0.42, 8.4), { id: 'df', face: sp, anim: 'run', frame: fr + 7 });
      cam3(K, shake(K, [rp[0] + 0.35 + Math.sin(t * 0.04) * 0.06, rp[1] - 2.65, 0.55], f * 1.4, 0.014, 2), [rp[0], rp[1] + 0.25, 0.5], 46);
      st.rin = Wp([rp[0], rp[1], 1.0]);
    } else if (phase === 3) {
      // O PASSE: de baixo, do lado; câmera lenta na trivela; o carrinho chega tarde
      const A = remap(t, WC_P4);
      const sd = lerp(8.55, 8.2, ease(seg(A, 0, 40)));
      const sp = saeAt(sd);
      const an = A < 40 ? 'run' : A < WC_STRIKE - 2 ? 'windup' : 'shoot';
      wa(K, 'sae', sp, { id: 'sae', face: P(-1.9, 5.4), anim: an, frame: an === 'run' ? Math.floor(f / 3) : 1, opts: an === 'shoot' ? { animTime: (A - WC_STRIKE + 2) * 1.4 } : undefined, light: [1.15, 1.02, 1.1] });
      const bp = A < WC_STRIKE ? saeBall(sp, f) : pass(A - WC_STRIKE);
      ballAt(K, bp);
      // o carrinho do zagueiro (da esquerda) chega quando a bola já foi
      const sl = seg(A, 52, 90);
      wa(K, 'df', P(lerp(-0.95, 0.15, ease(sl)), lerp(8.35, 8.05, sl)), { id: 'df', face: sp, anim: sl > 0 ? 'slide' : 'run', frame: fr + 7, opts: sl > 0 ? { animTime: sl * 40 } : undefined });
      wa(K, 'mf', P(0.22, lerp(7.75, 7.6, seg(A, 0, 80))), { id: 'mf', face: sp, anim: 'run', frame: fr + 5 });
      wa(K, 'charles', P(lerp(-0.6, -0.45, seg(A, 0, 80)), lerp(9.45, 9.1, seg(A, 0, 80))), { id: 'ch', face: sp, anim: 'run', frame: fr + 2 });
      const fol = easeIO(seg(A, WC_STRIKE, 114));
      cam3(K, shake(K, P(lerp(2.25, 2.0, seg(A, 0, WC_STRIKE)), 9.85, 0.24), f, A >= WC_STRIKE ? 0.02 * Math.max(0, 1 - (A - WC_STRIKE) / 20) : 0.004, 4), mix(P(0.25, 7.95, 0.45), P(-0.9, 6.3, 1.0), fol), lerp(46, 50, fol));
      st.foot = Wp(P(0.3, 7.95, 0.12));
      st.ball = Wp(bp);
    } else if (phase === 4) {
      // A LINHA: do alto, atrás do Sae — a bola faz a curva por cima de todos até você;
      // o Rin arrastou o Hugo para a direita; o Loki dispara lá de trás
      const k = t / 120;
      const tau = 40 + t * 0.53;
      const bp = pass(tau);
      ballAt(K, bp);
      const sp = saeAt(8.2);
      wa(K, 'sae', sp, { id: 'sae', face: P(-1.9, 5.4), anim: 'shoot', frame: 1, opts: { animTime: 60 } });
      wa(K, 'df', P(0.15, 8.05), { id: 'df', face: P(1, 8), anim: 'slide', opts: { animTime: 40 } });
      wa(K, 'mf', P(lerp(0.22, 0.0, k), lerp(7.6, 7.2, k)), { id: 'mf', face: bp, anim: 'run', frame: fr + 5 });
      wa(K, 'charles', P(-0.15, lerp(8.9, 8.5, k)), { id: 'ch', face: bp, anim: 'run', frame: fr + 2 });
      wa(K, 'rin', P(lerp(2.45, 2.7, k), lerp(4.3, 3.5, k)), { id: 'rin', face: P(2.7, 0), anim: 'run', frame: fr + 1 });
      wa(K, 'hugo', P(lerp(2.72, 2.95, k), lerp(4.85, 4.0, k)), { id: 'hugo', face: P(2.7, 0), anim: 'run', frame: fr + 3 });
      const yp = P(lerp(-2.65, -2.3, k), lerp(6.3, 5.25, k));
      wa(K, 'you', yp, { id: 'you', face: P(-2.1, 3), anim: 'run', frame: fr + 4 });
      const lk = easeIn(k);
      const lp = P(lerp(2.3, 0.9, lk), lerp(9.6, 7.2, lk));
      wa(K, 'loki', lp, { id: 'loki', face: yp, anim: 'run', frame: f });
      wa(K, 'shidou', P(-0.8, lerp(6.2, 5.3, k)), { id: 'shi', face: P(-0.5, 2), anim: 'run', frame: fr + 6 });
      wa(K, 'gk', GK0, { id: 'gk', face: bp, frame: 0 });
      [yp, lp, sp].forEach((p) => fieldShadows(K, p[0], p[1], 0.2));
      // câmera aérea voando atrás da bola (por cima de todos), olhando para onde ela vai cair
      const b0 = pass(Math.max(0, tau - 18));
      const dx = bp[0] - b0[0];
      const dy = bp[1] - b0[1];
      const dl = Math.hypot(dx, dy) || 1;
      const ce = [bp[0] - (dx / dl) * 2.0 + 0.35, bp[1] - (dy / dl) * 2.0, bp[2] + 0.95];
      cam3(K, shake(K, ce, f * 0.6, 0.01, 8), mix(bp, [yp[0], yp[1], 0.35], 0.45 + 0.25 * k), 54);
      st.ball = Wp(bp);
      st.b1 = Wp(pass(tau - 4));
      st.b2 = Wp(pass(tau - 10));
      st.loki = Wp([lp[0], lp[1], 0.4]);
    } else if (phase === 5) {
      // O COLÉGIO (lembrança): o campinho no fim de tarde; o Tada pedindo a bola
      K.sky('#312e81', '#fb923c', 0);
      K.fog('#7c3a1c', 0.02);
      K.ambient('#f0b080');
      K.floor({ x0: 70, y0: 0, x1: 100, y1: 30, color: '#4d7c0f' });
      for (let i = 0; i < 6; i++) K.floor({ x0: 76, y0: 9 + i * 2, x1: 96, y1: 10 + i * 2, z: 0.004, color: '#3f6212' });
      pic(K, { x: 86, y: 5, z: -0.5, w: 30, h: 9.4, ang: Math.PI / 2, img: schoolCv(), color: '#ffffff', light: [0.95, 0.75, 0.6] });
      miniGoal(K, 86, 9.0, 2.4, 0.9, 'x', '#f8fafc');
      K.actor('tada', { x: 87.4, y: 11.8, ang: Math.PI / 2, extra: KIT_SCHOOL, anim: 'call_pass', k: 0.9 });
      K.actor('gk_france', { id: 'gkc', x: 86, y: 9.4, ang: Math.PI / 2, extra: { jerseyPrimary: '#16a34a', jerseySecondary: '#052e16' }, frame: 0, k: 0.9, light: [0.8, 0.7, 0.6] });
      K.actor('you', { x: 85.75, y: 14.4, ang: -Math.PI / 2, extra: KIT_SCHOOL, anim: 'run', frame: Math.floor(f / 4), k: 0.9, light: [1.05, 0.85, 0.7] });
      K.ball(86.0, 14.1, 0.06);
      const k = easeIO(t / 120);
      K.cam([lerp(84.6, 84.9, k), lerp(0.7, 0.62, k), lerp(17.3, 16.9, k)], [86.4, 0.6, 12.0], lerp(48, 44, k));
    } else if (phase === 6) {
      // VELOCIDADE DIVINA: de lado, correndo com você; o Loki chega do fundo como um raio
      const k = t / 120;
      const tau = 104 + k * 18;
      const bp = pass(tau);
      ballAt(K, bp);
      const yp = P(lerp(-2.3, -2.12, k), lerp(5.25, 4.75, k));
      wa(K, 'you', yp, { id: 'you', face: P(-2.0, 3), anim: 'run', frame: Math.floor(f / 3) + 4 });
      const lk = easeIn(seg(t, 4, 110));
      const lp = P(lerp(0.9, -1.4, lk), lerp(7.2, 5.15, lk));
      wa(K, 'loki', lp, { id: 'loki', face: yp, anim: 'run', frame: f, light: [1.2, 1.12, 0.85] });
      wa(K, 'gk', GK0, { id: 'gk', face: bp, frame: 0 });
      wa(K, 'shidou', P(-0.8, 5.2), { id: 'shi', face: P(-0.5, 2), anim: 'run', frame: fr + 6 });
      fieldShadows(K, yp[0], yp[1], 0.24);
      fieldShadows(K, lp[0], lp[1], 0.24);
      cam3(K, shake(K, [yp[0] - 2.45, yp[1] + 0.55, 0.45], f, 0.006 + lk * 0.01, 5), [yp[0] + 0.75, yp[1] - 0.45, 0.62], 48);
      st.loki = Wp([lp[0], lp[1], 0.45]);
      st.loki0 = Wp(P(lerp(0.9, -1.4, Math.max(0, lk - 0.4)), lerp(7.2, 5.15, Math.max(0, lk - 0.4)), 0.45));
      st.ball = Wp(bp);
    } else if (phase === 7) {
      // METAVISÃO: o tempo parado; de trás de você, o gol lá na frente e o caminho até o ângulo
      const tau = 122 + seg(t, 0, 140) * 2;
      const bp = pass(tau);
      ballAt(K, bp);
      const yp = P(-2.12, 4.72);
      wa(K, 'you', yp, { id: 'you', face: P(-1.8, 3), anim: 'run', frame: 7 });
      wa(K, 'loki', P(-1.42, 5.15), { id: 'loki', face: yp, anim: 'run', frame: 5 });
      wa(K, 'gk', GK0, { id: 'gk', face: bp, frame: 0 });
      wa(K, 'mf', P(0.4, 3.3), { id: 'mf2', face: bp, anim: 'run', frame: 3 });
      wa(K, 'rin', P(2.7, 3.5), { id: 'rin', face: P(2.7, 0), anim: 'run', frame: 6 });
      wa(K, 'hugo', P(2.95, 4.0), { id: 'hugo', face: P(2.7, 0), anim: 'run', frame: 2 });
      const k = easeIO(t / 140);
      cam3(K, shake(K, P(lerp(-3.35, -3.1, k), lerp(7.35, 6.95, k), lerp(1.0, 0.92, k)), f * 0.5, 0.003), P(lerp(-0.7, -0.4, k), 2.0, 0.55), lerp(48, 44, k));
      st.ball = Wp(bp);
      st.you = Wp([yp[0], yp[1], 0.45]);
      st.ang = Wp(ANG);
      st.path = [bp, PB].concat([0.25, 0.5, 0.75, 1].map((q) => shot(q * SHOT_T)));
    } else if (phase === 8) {
      // DE PRIMEIRA: de perfil, rente ao chão; você chuta sem deixar cair; o carrinho do Loki
      // passa um instante tarde
      const A = remap(t, WC_P9);
      const tau = 124 + Math.min(A, WC_KA) * ((PASS_T - 124) / WC_KA);
      const kicked = A >= WC_KA;
      const ap = A < 26 ? ease(A / 26) : 1;
      const yp = P(lerp(-2.12, KICK_AT[0] - GX, ap), lerp(4.72, KICK_AT[1] - GY, ap));
      const an = A < 18 ? 'run' : !kicked ? 'windup' : 'shoot';
      wa(K, 'you', yp, { id: 'you', face: P(0.6, 0), anim: an, frame: an === 'run' ? Math.floor(f / 3) : 1, opts: kicked ? { animTime: (A - WC_KA) * 3 } : undefined });
      const bp = kicked ? shot(A - WC_KA) : pass(tau);
      ballAt(K, bp);
      // o carrinho do Loki (vem do fundo, passa por trás do seu pé depois do chute)
      const sl = seg(A, 22, 52);
      wa(K, 'loki', P(lerp(-0.95, -1.72, ease(sl)), lerp(5.15, 4.3, sl)), { id: 'loki', face: P(-2.5, 3.6), anim: sl > 0 ? 'slide' : 'run', frame: f, opts: sl > 0 ? { animTime: sl * 40 } : undefined, light: [1.15, 1.08, 0.85] });
      wa(K, 'gk', P(lerp(-0.28, -0.1, seg(A, 20, 40)), 0.5), { id: 'gk', face: bp, frame: 0 });
      // grama voando no chute
      if (kicked) {
        const tq = A - WC_KA;
        const cp = PB;
        const r = 0.12 + ease(seg(tq, 0, 20)) * 1.0;
        K.floor({ x0: cp[0] - r, y0: cp[1] - r, x1: cp[0] + r, y1: cp[1] + r, z: 0.012, img: ringFloorCv(), color: '#e0f2fe', alpha: 1 - seg(tq, 0, 20), em: true });
        for (let i = 0; i < 14; i++) {
          const a = rnd(i, 3) * TAU;
          const d = Math.min(0.9, tq * (0.012 + rnd(i, 4) * 0.02));
          const z = Math.max(0, tq * (0.02 + rnd(i, 5) * 0.02) - tq * tq * 0.0006);
          const x = cp[0] + Math.cos(a) * d;
          const y = cp[1] + Math.sin(a) * d;
          K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.04, color: '#4ade80', alpha: 1 - seg(tq, 30, 46) });
        }
      }
      const push = easeIO(seg(t, 0, WC_KT));
      cam3(K, shake(K, P(lerp(-4.45, -4.15, push), 4.78, 0.28), f * 2, kicked ? 0.032 * Math.max(0, 1 - (t - WC_KT) / 26) : 0.003, 3), P(-1.9, 4.32, 0.48), lerp(44, 37, push));
      st.foot = Wp(P(-1.9, 4.24, 0.32));
      st.ball = Wp(bp);
    } else if (phase === 9) {
      // RUMO AO ÂNGULO: atrás da bola; o goleiro voa e não alcança
      const s = 7 + t * 0.4;
      const bp = shot(s);
      ballAt(K, bp, { k: 0.85 });
      const dq = seg(t, 26, 80);
      wa(K, 'gk', P(lerp(-0.2, 0.42, ease(dq)), 0.55), { id: 'gk', z: Math.sin(dq * Math.PI) * 0.26, face: P(0, 9), anim: dq > 0 ? 'dive' : 'idle', opts: dq > 0 ? { animTime: dq * 30 } : undefined });
      const dir = [ANG[0] - PB[0], ANG[1] - PB[1]];
      const dl = Math.hypot(dir[0], dir[1]);
      const ux = dir[0] / dl;
      const uy = dir[1] / dl;
      cam3(K, shake(K, [bp[0] - ux * 1.05 - uy * 0.12, bp[1] - uy * 1.05 + ux * 0.12, bp[2] + 0.12], f * 2, 0.01), [bp[0] + ux * 1.2, bp[1] + uy * 1.2, bp[2] - 0.05], 56);
      st.ball = Wp(bp);
    } else if (phase === 10) {
      // A REDE: de dentro do gol — a bola vem no ângulo e a rede estufa
      const HIT = 26;
      const bp = t < HIT ? P(lerp(0.66, 0.8, t / HIT), lerp(2.4, -0.3, t / HIT), lerp(0.84, 0.86, t / HIT)) : P(0.8, -0.32, Math.max(0.1, 0.86 - (t - HIT) * 0.014));
      ballAt(K, bp, { k: 0.9 });
      wa(K, 'gk', P(0.98, 0.85), { id: 'gk', face: P(2, 0.85), anim: 'dive', opts: { animTime: 40 } });
      const cel = t > 64;
      wa(K, 'you', P(lerp(-2.02, -2.6, seg(t, 64, 140)), lerp(4.42, 3.4, seg(t, 64, 140))), { id: 'you', face: cel ? WC_CEL : P(0.6, 0), anim: cel ? 'run' : 'shoot', frame: cel ? fr : 1, opts: cel ? undefined : { animTime: 30 } });
      wa(K, 'loki', WC_LOKI, { id: 'loki', face: P(-2.5, 3.6), anim: 'slide', opts: { animTime: 40 } });
      wa(K, 'rin', P(2.4, 3.4), { id: 'rin', face: P(0.8, 0), frame: 0 });
      wa(K, 'hugo', P(2.75, 3.9), { id: 'hugo', face: P(0.8, 0), frame: 0 });
      cam3(K, shake(K, P(-0.4, -0.42, 0.46), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(0.25, 3.0, 0.5), 60);
      st.ball = Wp(bp);
      st.hit = t >= HIT;
    } else if (phase === 11) {
      // O APITO FINAL: você de braços abertos na quina da área; a grua sobe e mostra a
      // Catedral explodindo (o Loki ficou caído onde deu o carrinho)
      const k = easeIO(seg(t, 20, 180));
      const yp = WC_CEL;
      wa(K, 'you', yp, { id: 'you', face: P(-3.0, 0), anim: 'celebrate', light: [lerp(0.5, 1, k), lerp(0.55, 1, k), lerp(0.6, 1.05, k)] });
      const sk = ease(seg(t, 0, 100));
      wa(K, 'shidou', P(lerp(-1.2, -2.3, sk), lerp(5.6, 3.1, sk)), { id: 'shi', face: yp, anim: t < 100 ? 'run' : 'celebrate', frame: fr + 6 });
      const gk2 = ease(seg(t, 20, 170));
      wa(K, 'gaga', P(lerp(0.8, -1.7, gk2), lerp(9.5, 4.1, gk2)), { id: 'gaga', face: yp, anim: 'run', frame: fr + 2 });
      wa(K, 'sae', P(lerp(0.0, -0.9, k), lerp(7.6, 5.9, k)), { id: 'sae', face: yp, anim: 'run', frame: Math.floor(f / 6) });
      wa(K, 'rin', P(2.4, 3.6), { id: 'rin', face: yp, frame: 0 });
      wa(K, 'loki', WC_LOKI, { id: 'loki', face: P(-1.7, 0), anim: 'kneel_down' });
      wa(K, 'hugo', P(2.9, 4.3), { id: 'hugo', face: P(2.9, 9), frame: 0 });
      fieldShadows(K, yp[0], yp[1], 0.3);
      cam3(K, mix(P(-2.75, 0.08, 0.4), P(-1.9, 0.3, 2.9), k), mix([yp[0], yp[1], 0.68], P(-1.4, 6.6, 0.4), k), lerp(44, 60, k));
      st.you = Wp([yp[0], yp[1], 0.55]);
    } else {
      // OS QUATRO EGOS: o Sae vem andando até você; o Rin vira as costas; o Loki ajoelhado
      if (t < 84) {
        const k = t / 84;
        const sp = P(lerp(-1.35, -1.9, k), lerp(6.7, 5.3, k));
        wa(K, 'sae', sp, { id: 'sae', face: WC_CEL, anim: 'run', frame: Math.floor(f / 6), light: [1.1, 1.0, 1.06] });
        wa(K, 'gaga', P(-0.4, 7.4), { id: 'gaga', face: WC_CEL, anim: 'celebrate' });
        cam3(K, P(lerp(-2.15, -2.25, k), lerp(2.85, 3.0, k), 0.5), [sp[0] + 0.15, sp[1] + 0.4, 0.55], 44);
      } else if (t < 156) {
        const k = (t - 84) / 72;
        const turn = t > 118;
        const rp = P(2.4 + seg(t, 118, 156) * 0.25, 3.6 + seg(t, 118, 156) * 0.5);
        wa(K, 'rin', rp, { id: 'rin', face: turn ? P(2.7, 9) : WC_CEL, anim: turn ? 'run' : 'idle', frame: turn ? Math.floor(f / 6) : 0, light: [0.85, 0.95, 1.0], opts: { expr: 'angry' } });
        wa(K, 'you', WC_CEL, { id: 'you', face: P(-3.0, 0), anim: 'celebrate' });
        wa(K, 'shidou', P(-2.3, 3.1), { id: 'shi', face: WC_CEL, anim: 'celebrate' });
        cam3(K, P(lerp(4.7, 4.5, k), lerp(2.6, 2.75, k), 0.52), [rp[0] - 0.4, rp[1] + 0.1, 0.55], 44);
      } else {
        const k = easeIO((t - 156) / 84);
        wa(K, 'loki', WC_LOKI, { id: 'loki', face: P(-1.7, 9), anim: 'kneel_one', light: [0.9, 0.88, 0.8], opts: { expr: 'sweat' } });
        wa(K, 'hugo', P(-1.4, 3.65), { id: 'hugo', face: WC_LOKI, frame: 0, light: [0.85, 0.8, 0.82] });
        wa(K, 'you', WC_CEL, { id: 'you', face: P(-3.0, 0), anim: 'celebrate', light: [0.8, 0.85, 0.9] });
        cam3(K, P(lerp(-1.45, -1.6, k), lerp(6.95, 6.65, k), lerp(0.42, 0.38, k)), P(-1.75, 3.8, 0.5), lerp(46, 42, k));
      }
    }
  }

  // o passe de trivela: a parte de fora da chuteira do Sae na bola (pixel art)
  function wcCutTrivela(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[18, top + 30], [W * 0.47, top + 14], [W * 0.43, bot - 18], [18, bot - 34]],
      (b, g) => {
        g.fillStyle = '#fdf2f8';
        g.fillRect(b.x, b.y, b.w, b.h);
        curveLines(g, b.x + b.w * 0.2 + b.ox, b.y + b.h * 1.2, b.h * 0.5, b.h * 1.05, -Math.PI * 0.95, -Math.PI * 0.35, 26, 'rgba(15,23,42,0.55)', q * 40);
        const e = easeIO(q);
        const bx = b.x + b.w * 0.42 + b.ox;
        const by = b.y + b.h * 0.6;
        if (q > 0.8) CA.burst(g, bx, by, b.h * 0.24 * ease((q - 0.8) / 0.2), { fill: '#fbcfe8', stroke: '#0b0f19', lw: 10 });
        CA.ball(g, bx, by, b.h * 0.12, { rot: q * 4 });
        CA.boot(g, b.x + b.w * lerp(0.95, 0.62, e) + b.ox, b.y + b.h * lerp(0.82, 0.66, e), b.h * 0.13, { sock: '#1d4ed8', sock2: '#ffffff', boot: '#f472b6', ang: lerp(-0.9, -0.25, e), flip: true });
      },
      { k: kIn, from: [-W * 0.5, 0], pixel: PIX }
    );
  }
  // antes do chute: a sua chuteira indo na bola (sem cor, só o seu ciano)
  function wcCutKick(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[W * 0.36, top + 18], [W - 22, top + 30], [W - 40, bot - 22], [W * 0.3, bot - 36]],
      (b, g) => {
        g.fillStyle = '#dbe4ef';
        g.fillRect(b.x, b.y, b.w, b.h);
        const bx = b.x + b.w * 0.36 + b.ox;
        const by = b.y + b.h * (0.36 + 0.08 * q);
        CA.speedRadial(g, bx, by, S.W, S.H, { color: 'rgba(15,23,42,0.8)', inner: b.h * 0.22, n: 60, thick: 1.8 });
        if (q > 0.82) CA.burst(g, bx, by, b.h * 0.3 * ease((q - 0.82) / 0.18), { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
        g.fillStyle = 'rgba(0,245,212,0.35)';
        g.beginPath();
        g.arc(bx, by, b.h * 0.24, 0, TAU);
        g.fill();
        CA.ball(g, bx, by, b.h * 0.16, { rot: q * 3 });
        const e = easeIO(q);
        CA.boot(g, b.x + b.w * lerp(0.86, 0.5, e) + b.ox, b.y + b.h * lerp(0.95, 0.64, e), b.h * 0.15, { sock: '#64748b', sock2: '#e2e8f0', boot: '#22d3ee', ang: lerp(-1.0, 0.15, e), flip: true });
      },
      { k: kIn, from: [W * 0.5, 0], pixel: PIX }
    );
  }

  function wcOverlay(ctx, S, K) {
    const { W, H, t, phase, top, bot } = S;
    const st = stScreen(K);
    const score = (hs, min = "90+5'", k = 1, pop = 0) => CE.wcfgScore && CE.wcfgScore(ctx, W - 414, top + 18, hs, min, k, pop);
    if (phase === 0) {
      flares(ctx, K, S, 0.9, '253,230,138');
      CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 22), '#000000');
      CE.finKicker(ctx, 40, top + 30, 'CATEDRAL MUNDIAL • GRANDE FINAL', seg(t, 10, 46), '#facc15');
      CE.finKicker(ctx, 40, top + 58, "90+5' • O ÚLTIMO LANCE", seg(t, 34, 70), '#e2e8f0');
      score(2, "90+5'", seg(t, 8, 24));
      CE.cineSfx(S, 2, 'torcida', () => window.SFX?.whistle?.(1));
    } else if (phase === 1) {
      const g = CE.luckGrassCv && CE.luckGrassCv();
      if (g) ctx.drawImage(g, -160, bot - 90, W + 320, 120);
      CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.05);
      score(2);
    } else if (phase === 2) {
      CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.12);
      score(2);
      CE.cineSfx(S, 8, 'grito', () => window.SFX?.whoosh?.());
    } else if (phase === 3) {
      const A = remap(t, WC_P4);
      const tau = A - WC_STRIKE;
      // a câmera lenta escurece um pouco em volta (o mundo segura a respiração)
      ctx.save();
      ctx.globalAlpha = 0.22 * seg(t, 40, 60) * (1 - seg(t, 116, 140));
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, bot - top);
      ctx.restore();
      if (tau >= 0) {
        const fp = st.foot || { x: W * 0.5, y: H * 0.6 };
        CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(tau, 0, 5)), '#fdf2f8');
        if (tau < 5) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#fdf2f8', 0.35 * (1 - tau / 5));
        if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 3, 18, '249,168,212', 0.7 * (1 - seg(tau, 24, 44)));
      }
      // quadro de mangá: a parte de fora da chuteira do Sae na bola
      if (t > 54 && t < 104) wcCutTrivela(ctx, S, seg(t, 54, 63), seg(t, 56, 100));
      CE.cineSfx(S, 100, 'trivela', () => window.SFX?.kick?.(0.8));
      score(2);
    } else if (phase === 4) {
      flares(ctx, K, S, 0.7, '253,230,138');
      if (st.ball && st.b2) CE.luckStreak(ctx, st.b2.x, st.b2.y, st.ball.x, st.ball.y, 2, 14, '249,168,212', 0.6);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(255,255,255,0.45)', 0.8);
      if (st.loki) CE.cineGlow(ctx, st.loki.x, st.loki.y, 60, 'rgba(250,204,21,0.35)', seg(t, 40, 120));
      score(2);
      CE.cineSfx(S, 60, 'vento', () => window.SFX?.whoosh?.());
    } else if (phase === 5) {
      // a lembrança: sépia, grão de filme e as bordas escuras
      sepia(ctx, W, H, 0.62);
      ctx.save();
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(${i % 2 ? '255,236,200' : '40,20,8'},${0.08 + rnd(i + t * 7, 3) * 0.1})`;
        ctx.fillRect(rnd(i, t + 1) * W, top + rnd(i, t + 2) * (bot - top), 3, 3);
      }
      ctx.restore();
      CE.cineFlash(ctx, W, H, 0.85 * (1 - seg(t, 0, 10)), '#fff7ed');
      CE.cineFlash(ctx, W, H, 0.85 * seg(t, 110, 120), '#ffffff');
      CE.finKicker(ctx, 40, top + 30, 'COLÉGIO ICHINAN • A FINAL REGIONAL', seg(t, 8, 50), '#fb923c');
      CE.cineSfx(S, 2, 'lembranca', () => window.SFX?.whoosh?.());
    } else if (phase === 6) {
      // o Loki: um rastro dourado (raios curtos) de onde ele estava até onde está
      if (st.loki && st.loki0 && t > 6) {
        for (let i = 0; i < 3; i++) {
          const o = (i - 1) * 18;
          CE.wcfgBolt && CE.wcfgBolt(ctx, st.loki.x, st.loki.y + o, st.loki0.x, st.loki0.y + o * 0.5, Math.floor(t / 3) * 7 + i * 13, 12 + i * 4, LOKI_C, 4 - i);
        }
        CE.cineGlow(ctx, st.loki.x, st.loki.y, 90, 'rgba(250,204,21,0.3)', 0.9);
      }
      CE.drawSpeedLines(ctx, W, H, 'rgba(253,230,138,0.9)', 0.1 + seg(t, 40, 110) * 0.12);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.4)', 0.8);
      CE.cineSfx(S, 30, 'godspeed', () => window.SFX?.whoosh?.());
      score(2);
    } else if (phase === 7) {
      // o tempo parou: sem cor; só você (ciano) e o caminho até o ângulo
      bwBlue(ctx, W, H, 1);
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 100, 'rgba(0,245,212,0.32)', 0.85);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.5)', 0.9);
      const path = (st.path || []).map((p) => K.screen(p[0], p[2], p[1])).filter(Boolean);
      const lk = ease(seg(t, 30, 96));
      if (path.length > 2 && lk > 0) {
        // pontinhos quadrados (pixel) andando do pé até o ângulo
        const pts = [];
        for (let i = 1; i < path.length; i++) {
          for (let j = 0; j < 14; j++) {
            const q = j / 14;
            pts.push([lerp(path[i - 1].x, path[i].x, q), lerp(path[i - 1].y, path[i].y, q)]);
          }
        }
        const n = Math.floor(pts.length * lk);
        ctx.save();
        for (let i = 0; i < n; i++) {
          if ((i + Math.floor(t / 3)) % 3 === 0) continue;
          ctx.fillStyle = i > n - 4 ? '#f0fdfa' : YOU_C;
          ctx.fillRect(Math.round(pts[i][0] / 3) * 3 - 3, Math.round(pts[i][1] / 3) * 3 - 3, 6, 6);
        }
        ctx.restore();
        if (lk >= 1 && st.ang) CE.cineGlow(ctx, st.ang.x, st.ang.y, 60, 'rgba(0,245,212,0.55)', 0.6 + 0.3 * Math.sin(t * 0.3));
      }
      CE.cineSfx(S, 30, 'olhar', () => window.SFX?.blip?.(660));
    } else if (phase === 8) {
      const fp = st.foot || { x: W * 0.45, y: H * 0.7 };
      // até o chute sem cor; no chute: quadro invertido e a cor voltando em círculo do pé
      if (t < WC_KT) bwBlue(ctx, W, H, 1);
      else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, WC_KT, WC_KT + 16)) * W * 1.4 });
      if (t >= WC_KT && t < WC_KT + 2) impactFrame(ctx, W, H);
      if (t >= WC_KT) {
        CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, WC_KT + 1, WC_KT + 8)));
        if (t < WC_KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - WC_KT) / 8));
        if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '0,245,212', 0.85 * (1 - seg(t, WC_KT + 30, WC_KT + 54)));
        CE.cineImpactText(ctx, 'BAM!!', W * 0.72, top + 120, 110, '#f8fafc', seg(t, WC_KT, WC_KT + 6), W * 0.4, -0.1);
      } else if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.45)', 0.9);
      if (t > 58 && t < WC_KT) wcCutKick(ctx, S, seg(t, 58, 66), seg(t, 58, WC_KT));
      CE.cineSfx(S, WC_KT, 'chute', () => window.SFX?.kick?.(1));
    } else if (phase === 9) {
      CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.26);
      CE.drawSpeedLines(ctx, W, H, '#00f5d4', 0.1);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 120, 'rgba(0,245,212,0.42)');
      CE.cineSfx(S, 18, 'mergulho', () => window.SFX?.whoosh?.());
    } else if (phase === 10) {
      const HIT = 26;
      netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - (t - HIT) / 40) * Math.abs(Math.cos((t - HIT) * 0.25)) : 0);
      if (st.hit) {
        CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, HIT, HIT + 10)));
        CE.cineBokeh(ctx, W, top, top + (bot - top) * 0.5, t, 30, ['rgba(255,255,255,0.6)', 'rgba(250,204,21,0.5)'], 4);
        CE.cineImpactText(ctx, 'GOOOOOL!!', W / 2, top + (bot - top) * 0.44, 150, '#f8fafc', seg(t, HIT + 4, HIT + 12), W * 0.9, -0.06);
      }
      score(st.hit ? 3 : 2, "90+5'", 1, st.hit ? 1 - seg(t, HIT, HIT + 40) : 0);
      CE.cineSfx(S, HIT, 'rede', () => window.SFX?.goal?.(true));
    } else if (phase === 11) {
      flares(ctx, K, S, 1, '253,230,138');
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 170, 'rgba(255,255,255,0.2)', 1 - seg(t, 30, 120) * 0.7);
      confetti(ctx, S, t, 80, ['#00f5d4', '#facc15', '#f8fafc', '#1d4ed8', '#ef4444']);
      score(3, t >= 40 ? 'FIM' : "90+5'");
      CE.finKicker(ctx, 40, top + 30, 'FIM DE JOGO • JAPÃO 3 x 2 FRANÇA', seg(t, 60, 100), '#facc15');
      CE.cineSfx(S, 40, 'apito', () => window.SFX?.whistle?.(3));
    } else {
      flares(ctx, K, S, 0.3, '253,230,138');
      confetti(ctx, S, t + 200, 40, ['#00f5d4', '#facc15', '#f8fafc', '#1d4ed8']);
      // corte seco entre os três (um clarão curto) e o preto no fim
      [84, 156].forEach((c) => t >= c && CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, c, c + 6)), '#ffffff'));
      CE.cineFlash(ctx, W, H, seg(t, 214, 240), '#000000');
    }
  }

  CE.registerCine3D('wc_final_goal', {
    phases: WC_PH,
    music: 'epic',
    title: '🏆 O GOL DOS QUATRO EGOS',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    tags: [
      "PLANO 1 • 90+5' — A CATEDRAL", 'PLANO 2 • O REI COM A BOLA', 'PLANO 3 • A ISCA', 'PLANO 4 • A TRIVELA', 'PLANO 5 • A LINHA QUE SÓ ELE VIU', 'PLANO 6 • O COLÉGIO',
      'PLANO 7 • VELOCIDADE DIVINA', 'PLANO 8 • METAVISÃO', 'PLANO 9 • DE PRIMEIRA', 'PLANO 10 • O ÂNGULO', 'PLANO 11 • A REDE', 'PLANO 12 • O APITO FINAL', 'PLANO 13 • QUATRO EGOS'
    ],
    get subs() {
      const me = CE.cinePlayerName();
      return [
        [{ from: 30, who: 'NARRADOR', text: "90+5'. Japão 2 x 2 França. O último ataque.", color: NARR_C }],
        [{ from: 40, who: 'SAE ITOSHI', text: '(...Ali. Ninguém mais viu.)', color: SAE_C }],
        [
          { from: 6, to: 100, who: 'RIN ITOSHI', text: '"SAE! É MEU!"', color: RIN_C },
          { from: 100, who: 'HUGO', text: '"Te peguei."', color: HUGO_C }
        ],
        [{ from: 20, who: 'SAE ITOSHI', text: '"Receba."', color: SAE_C }],
        [],
        [{ from: 20, who: me, text: '(Passar... ou chutar?)', color: YOU_C }],
        [{ from: 30, who: 'JULIAN LOKI', text: '"Você não escapa de mim."', color: LOKI_C }],
        [{ from: 6, who: me, text: '(Eu já vi onde ela vai cair.)', color: YOU_C }],
        [{ from: 104, who: me, text: '(Dessa vez... eu chutei.)', color: YOU_C }],
        [],
        [{ from: 30, who: 'NARRADOR', text: 'GOOOOOL DO JAPÃO!! 3 x 2!', color: '#facc15' }],
        [{ from: 44, who: 'NARRADOR', text: 'FIM DE JOGO! O JAPÃO É CAMPEÃO DO MUNDO!', color: '#facc15' }],
        [
          { from: 8, to: 82, who: 'SAE ITOSHI', text: '"Bom gol."', color: SAE_C },
          { from: 90, to: 154, who: 'RIN ITOSHI', text: '"Tch."', color: RIN_C },
          { from: 166, who: 'JULIAN LOKI', text: '"...Um instante."', color: LOKI_C }
        ]
      ];
    },
    theme: 'worldcup_final',
    scene: wcScene,
    overlay: wcOverlay
  });
})();
