// ============================================================================
// CUTSCENES EM 3D — o Fox e a final contra a França (js/cine_fox2.js refeito no 3D)
// fox_entrance • fox_watch • four_egos_intro
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D. Os ajudantes 2D
// do Fox (olhos com anéis, sorriso, dedo girando, bandeiras) vêm do js/cine_fox2.js (CE.fx2*).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  // O kit não vira os bonecos (nem a bola) para a câmera da cena: eles ficam virados
  // para a câmera do mapa (Hub.camA) e de lado viram uma risca. Aqui cada quadro aponta o
  // Hub.camA para onde a câmera da cena olha e devolve o valor do mapa logo depois do
  // desenho (microtarefa: roda assim que o quadro termina).
  let camA0 = null;
  function aim(K) {
    const H = window.Hub;
    if (!H || !K.c || !K.c.eye) return;
    if (camA0 === null) {
      camA0 = H.camA;
      Promise.resolve().then(() => {
        if (camA0 !== null) H.camA = camA0;
        camA0 = null;
      });
    }
    const e = K.c.eye;
    const l = K.c.look;
    if (Math.abs(l[0] - e[0]) + Math.abs(l[2] - e[2]) > 1e-4) H.camA = Math.atan2(l[2] - e[2], l[0] - e[0]);
  }
  function register(type, def) {
    const scene = def.scene;
    def.scene = function (K, S) {
      scene.call(this, K, S);
      aim(K);
    };
    CE.registerCine3D(type, def);
  }

  // ---------------------------------------------------------------- ajudantes deste arquivo
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const pulse = (t, at, len = 18) => (t < at || t > at + len ? 0 : Math.pow(1 - (t - at) / len, 2));
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const MAPY = (y) => (window.SPRITE_MAPY ? window.SPRITE_MAPY(y) : y);
  const rgb01 = (h) => {
    const n = parseInt(String(h).replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const FOX_COLOR = '#f59e0b';
  // altura (unidades do quadro de 36) dos olhos e da boca do Fox e dos olhos dos jogadores no 3D
  const FOX_EYE = 11.2;
  const FOX_MOUTH = 14.3;
  const EYE_V = () => MAPY(10.25) + 0.35;

  // Canvas pintado uma vez só
  const CV = new Map();
  function paint(key, w, h, fn) {
    let cv = CV.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      fn.call(CE, g, w, h);
      CV.set(key, cv);
    }
    return cv;
  }

  // Onde fica na tela a unidade v do quadro do boneco (0 = topo, 33 = chão; 36 unidades no
  // quadro de 72 px) de um ator em (x, y, z) com escala k. Devolve também o "pé" do desenho 2D
  // (topo + 0,87 do tamanho), que é o que os ajudantes 2D (dedo, olhos) esperam.
  function spot(K, x, y, z = 0, k = 0.9, v = 0) {
    const h = (72 / 66) * k;
    const a = K.screen(x, z + (h * (33 - v)) / 36, y);
    const b = K.screen(x, z + (h * (34 - v)) / 36, y);
    if (!a || !b) return null;
    const u = a.y - b.y;
    const top = a.y - v * u;
    return { x: a.x, y: a.y, u, size: u * 36, top, feet: top + u * 36 * 0.87 };
  }

  // Várias caixas iguais numa peça só (um desenho por quadro em vez de dezenas)
  const pq = (v, a, b, c, d, n) => {
    const P = (p, u, w) => v.push(p[0], p[1], p[2], u, w, n[0], n[1], n[2]);
    P(a, 0, 0);
    P(b, 1, 0);
    P(c, 1, 1);
    P(a, 0, 0);
    P(c, 1, 1);
    P(d, 0, 1);
  };
  function boxes(K, list, o) {
    if (!K._push) {
      list.forEach((b) => K.box(Object.assign({}, o, b)));
      return;
    }
    const s = [];
    const tp = [];
    list.forEach(({ x0, y0, x1, y1, z0 = 0, z1 = 1 }) => {
      pq(s, [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1]);
      pq(s, [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1]);
      pq(s, [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0]);
      pq(s, [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0]);
      pq(tp, [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0]);
    });
    K._push(s, o);
    K._push(tp, Object.assign({}, o, { color: o.top || o.color }));
  }

  // Brilho redondo (placa acesa virada para a câmera; a cor tinge o branco)
  const glowCv = () =>
    paint('glow', 64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.35, 'rgba(255,255,255,0.5)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
  function glowAt(K, x, y, z, s, color, alpha, eye) {
    K.quad({ x, y, z: z - s / 2, w: s, h: s, ang: Math.atan2(eye[2] - y, eye[0] - x), img: glowCv(), color, alpha, em: true });
  }
  // Cone de holofote (do alto até o chão), virado para a câmera
  const coneCv = () =>
    paint('cone', 64, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0.12)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(26, 0);
      g.lineTo(38, 0);
      g.lineTo(64, 128);
      g.lineTo(0, 128);
      g.closePath();
      g.fill();
    });
  const discCv = () =>
    paint('disc', 64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,0.8)');
      r.addColorStop(0.7, 'rgba(255,255,255,0.35)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });

  // ==========================================================================
  // 1) A ENTRADA DO FOX — o campo do prédio de madrugada; o Fox na arquibancada
  // ==========================================================================
  const YOU_AT = [53.3, 11.3];
  const FOX_AT = [59.95, 14.5, 0.44]; // de pé no 2º degrau da arquibancada do lado leste
  const TOWERS = [[45.3, 22.7], [60.7, 22.7], [60.7, 6.3], [45.3, 6.3]]; // na ordem em que apagam
  const OFF_AT = [24, 50, 76, 102];
  const KICKS = [40, 126];

  // A arquibancada do lado leste do campo (3 degraus e as cadeiras)
  let STANDS = null;
  function eastStands(K) {
    if (!STANDS) {
      STANDS = { steps: [], seats: [], backs: [] };
      [[59.0, 0.22], [59.6, 0.44], [60.2, 0.66]].forEach(([x0, z1], r) => {
        STANDS.steps.push({ x0, y0: 8.6, x1: 61, y1: 20.4, z0: 0, z1 });
        for (let y = 8.95; y < 20.2; y += 0.56) {
          if (r === 1 && Math.abs(y - FOX_AT[1]) < 0.5) continue; // o lugar dele
          const sx = x0 + 0.34;
          STANDS.seats.push({ x0: sx - 0.13, y0: y - 0.17, x1: sx + 0.1, y1: y + 0.17, z0: z1, z1: z1 + 0.1 });
          STANDS.backs.push({ x0: sx + 0.1, y0: y - 0.17, x1: sx + 0.16, y1: y + 0.17, z0: z1, z1: z1 + 0.3 });
        }
      });
    }
    boxes(K, STANDS.steps, { color: '#0b1220', top: '#111a2e' });
    boxes(K, STANDS.seats, { color: '#0f1a33', top: '#1e3a8a' });
    boxes(K, STANDS.backs, { color: '#1e3a8a', top: '#1d4ed8' });
  }

  // As cabeças dos refletores: apagadas (com o filamento esfriando em laranja)
  function lampsOff(K, t, phase) {
    TOWERS.forEach(([x, y], i) => {
      const off = phase > 1 || (phase === 1 && t >= OFF_AT[i]);
      if (!off) return;
      const cool = phase === 1 ? 1 - seg(t, OFF_AT[i], OFF_AT[i] + 30) : 0;
      const col = cool > 0 ? mix([0.07, 0.08, 0.12], [0.98, 0.57, 0.24], cool) : [0.05, 0.06, 0.09];
      K.box({ x0: x - 0.47, y0: y - 0.22, x1: x + 0.47, y1: y + 0.22, z0: 3.08, z1: 3.57, color: col, em: true });
    });
  }

  register('fox_entrance', {
    phases: [180, 170, 190, 200, 170],
    music: 'dread',
    title: '🦊 A ENTRADA DO FOX',
    tags: ['PLANO 1 • MADRUGADA NO BLUE LOCK', 'PLANO 2 • AS LUZES', 'PLANO 3 • O SORRISO', 'PLANO 4 • A RAPOSA', 'PLANO 5 • NINGUÉM SABE'],
    subs: [
      [{ from: 4, who: 'VOCÊ', text: '(Mais um. Até esquecer como se erra.)', color: '#00f5d4' }],
      [{ from: 64, who: 'VOCÊ', text: '"...Quem tá aí?"', color: '#00f5d4' }],
      [{ from: 20, text: 'No escuro, alguém está rindo.' }],
      [{ from: 80, who: 'FOX', text: '"Boa noite, campeão."', color: FOX_COLOR }],
      [{ from: 6, text: 'Quem descobre o que ele quer... muda.', color: '#fca5a5' }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      const fox = CE.fx2Fox();
      eastStands(K);
      lampsOff(K, t, phase);
      // quantas luzes já apagaram (o mundo escurece junto)
      const offN = phase === 0 ? 0 : phase === 1 ? OFF_AT.filter((a) => t >= a).length : 4;
      if (offN > 0) K.c.noLights = true;
      if (phase === 0) {
        // O campo vazio de madrugada: você chutando sozinho, de novo e de novo
        K.expo(0.84);
        let anim = 'idle';
        let flight = null;
        let inNet = 3;
        KICKS.forEach((kt) => {
          if (t >= kt - 14 && t < kt) anim = 'windup';
          else if (t >= kt && t < kt + 16) anim = 'shoot';
          if (t >= kt && t < kt + 24) flight = (t - kt) / 24;
          if (t >= kt + 24) inNet++;
        });
        K.actor('you', { x: YOU_AT[0], y: YOU_AT[1], face: [53, 6.4], anim, kit: 'blueLock' });
        // bolas espalhadas e as que já entraram
        [[52.55, 11.85], [52.95, 12.3], [54.2, 11.95], [51.7, 12.6]].forEach(([x, y]) => K.ball(x, y, 0.09));
        for (let i = 0; i < inNet; i++) K.ball(52.35 + i * 0.3, 6.32 + (i % 2) * 0.14, 0.09);
        if (flight !== null) {
          const e = ease(flight);
          K.ball(lerp(YOU_AT[0] + 0.12, 53.1, e), lerp(YOU_AT[1] - 0.25, 6.4, e), 0.09 + Math.sin(flight * Math.PI) * 0.75 + e * 0.25);
        } else if (!KICKS.some((kt) => t >= kt + 24 && t < kt + 70)) {
          K.ball(YOU_AT[0] + 0.14, YOU_AT[1] - 0.28, 0.09);
        }
        // plano aberto e alto, descendo devagar até ficar atrás de você
        const e = easeIO(k);
        K.cam(K.mix([57.6, 2.6, 17.4], [55.0, 1.2, 14.2], e), K.mix([53.0, 0.3, 8.6], [53.15, 0.5, 8.4], e), lerp(52, 44, e));
      } else if (phase === 1) {
        // Por trás de você: as torres apagando uma por uma — CLACK
        K.expo(lerp(0.95, 0.42, offN / 4) - seg(t, 102, 130) * 0.06);
        const lit = 1 - offN / 4;
        K.actor('you', { x: YOU_AT[0], y: YOU_AT[1], face: [53, 6.4], kit: 'blueLock', light: mix([0.16, 0.2, 0.34], [1, 1, 1], lit) });
        for (let i = 0; i < 6; i++) K.ball(52.35 + i * 0.3, 6.32 + (i % 2) * 0.14, 0.09, { light: mix([0.2, 0.22, 0.3], [1, 1, 1], lit) });
        const punch = OFF_AT.reduce((s, a) => s + pulse(t, a, 14), 0);
        const n = K.noise(S.f, 3) * 0.012 * punch;
        const e = easeIO(k);
        K.cam([lerp(54.15, 54.0, e) + n, lerp(0.62, 0.58, e) + n, lerp(13.4, 13.0, e)], [52.7, lerp(1.45, 1.55, e), 6.0], 60);
      } else if (phase === 2) {
        // No escuro: só os olhos e o sorriso de alguém na arquibancada
        K.expo(0.34);
        K.fog('#030104', 0.05);
        K.actor(fox, { x: FOX_AT[0], y: FOX_AT[1], z: FOX_AT[2], ang: Math.PI, view: 'front', k: 0.95, light: [0.34, 0.1, 0.11] });
        const n = K.noise(S.f, 5) * 0.004;
        const e = easeIO(k);
        const ez = FOX_AT[2] + 0.6;
        K.cam([FOX_AT[0] - lerp(1.75, 1.4, e), ez + n, FOX_AT[1] + n], [FOX_AT[0], ez - 0.04, FOX_AT[1]], 30);
      } else if (phase === 3) {
        // O holofote acende: o Fox de pé na arquibancada, girando o dedo
        K.expo(0.62);
        K.fog('#020308', 0.035);
        const on = seg(t, 0, 6);
        // (plano médio: no close o boneco de 72 px virava blocos enormes)
        const eye = K.mix([55.4, 0.45, 16.6], [57.3, 0.62, 16.05], easeIO(seg(t, 10, 160)));
        K.actor(fox, { x: FOX_AT[0], y: FOX_AT[1], z: FOX_AT[2], ang: Math.PI, view: 'front', k: 0.95, light: mix([0.1, 0.05, 0.06], [1.3, 1.36, 1.48], on) });
        K.quad({ x: FOX_AT[0] + 0.05, y: FOX_AT[1], z: FOX_AT[2] - 0.05, w: 1.5, h: 4.2, ang: Math.atan2(eye[2] - FOX_AT[1], eye[0] - FOX_AT[0]), img: coneCv(), color: '#dbeafe', alpha: 0.32 * on, em: true });
        K.floor({ x0: FOX_AT[0] - 0.85, y0: FOX_AT[1] - 0.85, x1: FOX_AT[0] + 0.85, y1: FOX_AT[1] + 0.85, z: FOX_AT[2] + 0.004, img: discCv(), color: '#e0f2fe', alpha: 0.6 * on, em: true });
        const sh = pulse(t, 0, 20) * 0.02;
        K.cam([eye[0] + K.noise(S.f, 1) * sh, eye[1], eye[2]], [FOX_AT[0], lerp(1.0, 1.08, seg(t, 10, 160)), lerp(15.05, 14.95, seg(t, 10, 160))], lerp(50, 44, easeIO(seg(t, 10, 160))));
      } else {
        // NINGUÉM SABE: o rosto dele no holofote, a câmera rodando devagar
        K.expo(0.66);
        K.fog('#020104', 0.05);
        K.actor(fox, { x: FOX_AT[0], y: FOX_AT[1], z: FOX_AT[2], ang: Math.PI, view: 'front', k: 0.95, light: [1.22, 0.86, 0.8] });
        // (mais aberto: só o rosto, o boneco de 72 px virava blocos)
        const a = Math.PI + lerp(0.35, 0.12, easeIO(k));
        const r = lerp(2.2, 1.9, easeIO(k));
        const ez = FOX_AT[2] + 0.46;
        K.cam([FOX_AT[0] + Math.cos(a) * r, ez - 0.02, FOX_AT[1] + Math.sin(a) * r], [FOX_AT[0], ez + 0.06, FOX_AT[1] + 0.12], 38);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const fox = CE.fx2Fox();
      // no boneco do Fox (adulto) os olhos e a boca ficam mais altos que nos outros (medido nas fotos)
      const mouthV = FOX_MOUTH;
      const eyeV = FOX_EYE;
      if (phase === 0) {
        KICKS.forEach((kt) => CE.cineSfx(S, kt, 'kick' + kt, () => window.SFX?.kick?.(0.75)));
        CE.cineDust(ctx, W, H * 0.8, t, 24, 'rgba(219,234,254,0.45)', 7);
        CE.fx2Kicker(ctx, 40, top + 36, 'UMA SEMANA DEPOIS DO TÍTULO', seg(t, 6, 50), '#facc15');
        CE.fx2Kicker(ctx, 40, top + 74, 'BLUE LOCK • 03:12 DA MADRUGADA', seg(t, 34, 84), '#38bdf8');
      } else if (phase === 1) {
        // CLACK em cada torre (as de trás da câmera aparecem nos cantos de baixo)
        TOWERS.forEach(([x, y], i) => {
          const a = t - OFF_AT[i];
          if (a < 0 || a > 30) return;
          let p = K.screen(x, 3.4, y);
          if (!p || p.x < 0 || p.x > W) p = { x: i % 2 ? W - 170 : 170, y: H * 0.66 };
          const sx = Math.max(110, Math.min(W - 110, p.x));
          const sy = Math.max(top + 50, Math.min(bot - 60, p.y + 30));
          if (p.y > top) CE.cineGlow(ctx, p.x, p.y, 90, 'rgba(251,146,60,0.55)', 1 - seg(a, 0, 30));
          CE.fx2Word(ctx, 'CLACK', sx, sy, 30, '#e2e8f0', seg(a, 0, 6), 1 - seg(a, 20, 30), i % 2 ? 0.08 : -0.08);
          CE.cineSfx(S, OFF_AT[i], 'clack' + i, () => window.SFX?.tackle?.());
        });
        // A faixa dos seus olhos: alguém está ali
        const e1 = ease(seg(t, 116, 132));
        if (e1 > 0) {
          const you = CE.cineYou(CE.KITS.blueLock);
          const y0 = top + 26;
          const y1 = top + 170;
          CE.fx2Panel(
            ctx,
            [[W * 0.4, y0], [W - 26, y0], [W - 26, y1], [W * 0.4 - 30, y1]],
            () => {
              ctx.fillStyle = '#01030a';
              ctx.fillRect(0, y0 - 10, W, y1 - y0 + 20);
              const dw = 620;
              const U = dw / 14;
              const cx = W * 0.71;
              const cy = (y0 + y1) / 2;
              CE.fx2Crop(ctx, you, {}, 11, 7, 14, 6, cx - dw / 2, cy - 3.25 * U, dw, 6 * U);
              const real = CE.cineSpriteEyes(ctx, you, cx, cy - 0.15 * U, U, { tiny: true });
              [14.55, 21.45].forEach((ux) => {
                if (!real) CE.drawPixelEye(ctx, cx - dw / 2 + (ux - 11) * U, cy, U * 0.28, { line: '#020617', iris: CE.fx2Shade(you.eyeColor || '#0f766e', -0.5), ring: you.eyeColor || '#5eead4', tiny: true, look: Math.round(Math.sin(t * 0.3)) });
              });
              ctx.fillStyle = 'rgba(8,16,44,0.5)';
              ctx.fillRect(0, y0 - 10, W, y1 - y0 + 20);
            },
            { dx: (1 - e1) * W * 0.7, width: 5 }
          );
        }
      } else if (phase === 2) {
        const laughs = [
          { at: 52, text: 'hehe...', x: 0.16, y: 0.26, s: 26, r: -0.1 },
          { at: 92, text: 'Hehehe...', x: 0.84, y: 0.32, s: 34, r: 0.08 },
          { at: 130, text: 'HEHEHEHE!!', x: 0.2, y: 0.74, s: 46, r: -0.06 },
          { at: 160, text: 'HEHEHEHEHE!!!', x: 0.76, y: 0.8, s: 52, r: 0.06 }
        ];
        const shake = laughs.reduce((s, l) => s + pulse(t, l.at, 22), 0);
        const bob = Math.sin(t * 0.5) * shake * 2;
        const f = spot(K, FOX_AT[0], FOX_AT[1], FOX_AT[2], 0.95, eyeV);
        if (f) {
          CE.cineGlow(ctx, f.x, f.y, f.u * 26, 'rgba(127,29,29,0.5)', 0.25 + seg(t, 40, 190) * 0.6);
          CE.fx2FoxEyes(ctx, f.x, f.y + bob, f.u, seg(t, 30, 40), { glow: 'rgba(254,226,226,0.22)' });
          CE.fx2Grin(ctx, f.x, f.y + (mouthV - eyeV) * f.u + bob, 9 * f.u, ease(seg(t, 62, 100)));
        }
        laughs.forEach((l) => CE.fx2Word(ctx, l.text, W * l.x, H * l.y, l.s, '#ef4444', seg(t, l.at, l.at + 10), 1, l.r));
      } else if (phase === 3) {
        CE.cineSfx(S, 0, 'spot', () => window.SFX?.post?.());
        CE.cineDust(ctx, W, H * 0.8, t, 22, 'rgba(219,234,254,0.5)', 11);
        CE.cineFlash(ctx, W, H, 0.85 * (1 - seg(t, 0, 10)), '#e0f2fe');
        CE.fx2Kicker(ctx, 60, top + 120, 'TÉCNICO DA INGLATERRA SUB-20', seg(t, 58, 90), '#ef4444');
        const kf = seg(t, 72, 84);
        CE.cineImpactText(ctx, 'FOX', 230, top + 230, 150, '#f5f5f4', kf);
        if (kf > 0) {
          ctx.fillStyle = FOX_COLOR;
          ctx.fillRect(70, top + 300, 330 * ease(seg(t, 80, 100)), 6);
        }
        CE.fx2Text(ctx, 'O homem que vocês eliminaram.', 70, top + 336, 'italic 700 20px "Segoe UI", sans-serif', '#cbd5e1', seg(t, 100, 116), 'left');
      } else {
        // o sorriso no rosto de verdade (as faixas de mangá com os olhos ampliados e o dedo
        // girando saíram: ampliado, o boneco de 72 px virava blocos)
        const f = spot(K, FOX_AT[0], FOX_AT[1], FOX_AT[2], 0.95, eyeV);
        if (f) {
          CE.cineGlow(ctx, f.x, f.y + (mouthV - eyeV) * f.u, f.u * 14, 'rgba(239,68,68,0.22)');
          CE.fx2Grin(ctx, f.x, f.y + (mouthV - eyeV) * f.u, 8.6 * f.u, ease(seg(t, 40, 70)));
        }
        ctx.fillStyle = `rgba(0,0,0,${seg(t, 150, 170)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  });

  // ==========================================================================
  // 2) O FOX NA ARQUIBANCADA INGLESA — o rosto NUNCA aparece (área vazia K.VOID)
  // ==========================================================================
  // Arquibancada virada para o sul (a câmera fica no sul olhando para o norte)
  const VX = 86;
  const VY = 17;
  const ROWS = 4;
  const rowY = (r) => VY + 0.6 - r * 0.85; // borda da frente do degrau
  const rowZ = (r) => 0.18 + r * 0.36; // altura do degrau
  const FOXW = [VX + 0.6, rowY(2) - 0.42, rowZ(2) - 0.34]; // sentado (as pernas somem no degrau)
  let FANS = null;
  function englishFans() {
    if (FANS) return FANS;
    const A = window.App || {};
    const hairs = ['short_sharp', 'buzz_tall', 'soft_side', 'soft_curls'];
    const skins = A.CREATOR_SKIN || ['#f3d1b8', '#e8b796', '#c98e6a', '#8d5a3b'];
    const cols = ['#3f2a1d', '#1c1917', '#a16207', '#78350f', '#d6b370', '#57534e'];
    const shirts = ['#f8fafc', '#dc2626', '#e2e8f0', '#b91c1c', '#1e3a8a', '#f8fafc'];
    FANS = [];
    for (let r = 0; r < ROWS; r++) {
      for (let i = 0; i < 12; i++) {
        const x = VX - 5.9 + i * 1.04 + (r % 2) * 0.5 + (hash(i, r) - 0.5) * 0.2;
        if (r === 2 && Math.abs(x - FOXW[0]) < 0.6) continue; // o lugar dele
        if (r === 1 && Math.abs(x - FOXW[0]) < 0.45) continue; // a frente dele livre
        const q = Math.floor(hash(i, r + 11) * 997);
        FANS.push({
          x,
          y: rowY(r) - 0.42,
          z: rowZ(r),
          r,
          ph: hash(i, r + 7) * 6,
          arms: hash(i, r + 3) < 0.55,
          cd: { name: 'torcedor' + r + '_' + i, skinColor: skins[q % skins.length], hairColor: cols[(q >> 2) % cols.length], hairSecondary: cols[(q >> 4) % cols.length], eyeColor: '#1e293b', hairStyle: hairs[(q >> 3) % hairs.length], outfit: 'casual', clothesColor: shirts[(q >> 5) % shirts.length], jerseyPrimary: '#f8fafc', jerseySecondary: '#dc2626' }
        });
      }
    }
    return FANS;
  }
  function englishStands(K, t, cheer, eye, near = 0) {
    K.sky('#01030b', '#0a1430', 0.3);
    K.fog('#050a1a', 0.06);
    K.ambient('#8ea2cf');
    const steps = [];
    for (let r = 0; r < ROWS + 1; r++) steps.push({ x0: VX - 8, y0: rowY(r) - 0.85, x1: VX + 8, y1: rowY(r), z0: 0, z1: rowZ(r) });
    boxes(K, steps, { color: '#0c1730', top: '#13254a', light: [0.7, 0.75, 0.95] });
    // a borda de cada degrau com a faixa vermelha
    boxes(K, [0, 1, 2, 3].map((r) => ({ x0: VX - 8, y0: rowY(r) - 0.04, x1: VX + 8, y1: rowY(r), z0: rowZ(r), z1: rowZ(r) + 0.05 })), { color: '#b91c1c', light: [0.8, 0.8, 0.9] });
    // o anel de cima pintado (torcida de longe, faixas, os refletores da cobertura)
    const bg = paint('engstands', 1480, 400, (g, w, h) => CE.fx2BgEngStands(g, w, h));
    K.quad({ x: VX, y: rowY(ROWS) - 1.2, z: rowZ(ROWS) - 0.4, w: 24, h: 6.5, ang: -Math.PI / 2, img: bg, light: [1.25, 1.25, 1.35] });
    // os refletores da cobertura (acesos)
    for (let i = 0; i < 9; i++) glowAt(K, VX - 10 + i * 2.5, rowY(ROWS) - 1.05, rowZ(ROWS) - 0.4 + 5.2, 1.6, '#dbeafe', 0.7, eye);
    // a torcida pulando
    englishFans().forEach((f, i) => {
      // (nos closes, quem fica entre a câmera e o Fox sai do quadro)
      if (near && f.y > FOXW[1] + 0.1 && Math.abs(f.x - eye[0]) < near) return;
      const jump = cheer * Math.max(0, Math.sin(t * 0.22 + f.ph)) * 0.09;
      K.actor(f.cd, { id: i, x: f.x, y: f.y, z: f.z + jump, ang: Math.PI / 2, anim: cheer > 0 && f.arms ? 'call_pass' : 'idle', frame: 0, k: 0.88, left: hash(i, 5) < 0.5, light: [0.62, 0.68, 0.92] });
    });
  }
  // o Fox sentado: o rosto na sombra (só o sorriso aparece no overlay)
  function foxSeated(K, light, dz = 0) {
    K.actor(CE.fx2Fox(), { x: FOXW[0], y: FOXW[1], z: FOXW[2] + dz, ang: Math.PI / 2, view: 'front', k: 0.92, light });
  }

  register('fox_watch', {
    phases: [200, 220, 180],
    music: 'dread',
    title: '🦊 ENQUANTO ISSO, NA ARQUIBANCADA...',
    tags: ['PLANO 1 • A ARQUIBANCADA', 'PLANO 2 • O SORRISO', 'PLANO 3 • ???'],
    subs: [
      [{ from: 54, text: 'Menos um homem de terno, imóvel.', color: '#fca5a5' }],
      [
        { from: 14, to: 108, who: '???', text: '"Finalmente..."', color: FOX_COLOR },
        { from: 108, who: '???', text: '"Eu vi um MONSTRO."', color: FOX_COLOR }
      ],
      [{ from: 2, text: 'Ninguém viu ele sorrir. Quem é esse homem?', color: '#fca5a5' }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      K.expo(0.9);
      if (phase === 0) {
        // travelling pela fileira e depois entrando nele
        const pan = easeIO(seg(t, 0, 150));
        const push = easeIO(seg(t, 110, 200));
        const e0 = [lerp(VX - 4.2, VX - 1.2, pan), 1.05, VY + 4.6];
        const l0 = [e0[0] + 1.2, 1.25, VY - 2.0];
        const e1 = [FOXW[0] - 0.2, 1.42, FOXW[1] + 2.75];
        const l1 = [FOXW[0] - 0.3, FOXW[2] + 0.62, FOXW[1]];
        const eye = K.mix(e0, e1, push);
        englishStands(K, t, 1, eye);
        foxSeated(K, [0.26, 0.28, 0.4]);
        K.cam(eye, K.mix(l0, l1, push), lerp(50, 40, push));
      } else if (phase === 1) {
        // close no rosto na sombra: só o sorriso
        const mon = pulse(t, 150, 40);
        const e = easeIO(k);
        const ez = FOXW[2] + 0.56;
        // (mais aberto: no close o boneco de 72 px virava blocos)
        const eye = [FOXW[0] + 0.05 + K.noise(S.f, 2) * 0.004 * (1 + mon * 4), ez, FOXW[1] + lerp(2.2, 1.95, e)];
        englishStands(K, t, 1, eye, 1.3);
        foxSeated(K, [0.1, 0.12, 0.2], Math.sin(t * 0.08) * 0.004);
        K.cam(eye, [FOXW[0] + 0.3, ez - 0.05, FOXW[1]], 36);
      } else {
        // ele rindo sentado no meio da festa inglesa, girando o dedo
        const laugh = Math.abs(Math.sin(t * 0.32)) * (t > 20 ? 0.012 : 0);
        const e = easeIO(k);
        const eye = [FOXW[0], lerp(1.3, 1.24, e), FOXW[1] + lerp(2.6, 2.3, e)];
        englishStands(K, t, 0.8, eye, 1.0);
        foxSeated(K, [0.16, 0.18, 0.28], laugh);
        K.cam(eye, [FOXW[0], FOXW[2] + 0.45, FOXW[1]], 46);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top } = S;
      const fox = CE.fx2Fox();
      const mouthV = FOX_MOUTH;
      if (phase === 0) {
        CE.fx2Flashes(ctx, 0, W, top + 20, top + 220, t, 5, 6, 3);
        const f = spot(K, FOXW[0], FOXW[1], FOXW[2], 0.92, mouthV);
        if (f) CE.fx2Grin(ctx, f.x, f.y, 7.6 * f.u, seg(t, 120, 150) * 0.85);
        CE.fx2Kicker(ctx, 40, top + 36, 'ENQUANTO ISSO, NA ARQUIBANCADA INGLESA...', seg(t, 4, 50), '#ef4444');
        CE.fx2Word(ctx, 'TODO MUNDO GRITA.', 44, top + 96, 40, '#f8fafc', seg(t, 22, 34), 1 - seg(t, 104, 120) * 0.6, -0.04, 0, 'left');
        CE.fx2Word(ctx, 'MENOS UM.', 44, top + 156, 58, '#ef4444', seg(t, 112, 124), 1, -0.04, 0, 'left');
        CE.cineSfx(S, 2, 'crowd', () => window.SFX?.crowdVoice?.(300, 520, 1.6, 0.1));
      } else if (phase === 1) {
        const mon = pulse(t, 150, 40);
        CE.cineBokeh(ctx, W, top + 20, top + 300, t, 12, ['rgba(219,234,254,0.25)', 'rgba(239,68,68,0.18)'], 4);
        const f = spot(K, FOXW[0], FOXW[1], FOXW[2] + Math.sin(t * 0.08) * 0.004, 0.92, mouthV);
        if (f) {
          CE.cineGlow(ctx, f.x, f.y, f.u * 10, 'rgba(127,29,29,0.35)', 0.4 + mon);
          CE.fx2Grin(ctx, f.x, f.y, 7.6 * f.u, 1);
        }
        const words = [
          { at: 14, text: '...hehe.', y: 0.24, s: 34, c: '#cbd5e1' },
          { at: 52, text: 'FINALMENTE.', y: 0.38, s: 64, c: '#f8fafc' },
          { at: 98, text: 'DEPOIS DE TANTO TEMPO...', y: 0.53, s: 42, c: '#cbd5e1' },
          { at: 150, text: 'UM MONSTRO.', y: 0.7, s: 86, c: '#ef4444' }
        ];
        words.forEach((w, i) => {
          const next = words[i + 1];
          const dim = next && t > next.at ? 0.35 : 1;
          CE.fx2Word(ctx, w.text, W * 0.74, H * w.y, w.s, w.c, seg(t, w.at, w.at + 12), dim, -0.04, W * 0.44);
        });
      } else {
        CE.fx2Flashes(ctx, 0, W, top + 20, top + 200, t, 4, 6, 9);
        const laugh = Math.abs(Math.sin(t * 0.32)) * (t > 20 ? 0.012 : 0);
        const g = spot(K, FOXW[0], FOXW[1], FOXW[2] + laugh, 0.92, 0);
        let tip = null;
        if (g) {
          CE.fx2Grin(ctx, g.x, g.top + mouthV * g.u, 7.6 * g.u, 1);
          // (sem o dedo desenhado por cima: de perto parecia um cigarro)
        }
        CE.fx2Word(ctx, 'HEHEHEHE...', W / 2, top + 70, 58, '#fca5a5', seg(t, 26, 38), 1, -0.03);
        if (tip) CE.fx2Word(ctx, 'TWIRL', tip.x + 80, tip.y - 40, 22, '#fde68a', seg(t, 44, 52), 1, -0.1);
        ctx.fillStyle = `rgba(0,0,0,${seg(t, 160, 180)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  });

  // ==========================================================================
  // 3) FINAL CONTRA A FRANÇA — "4 EGO'S" (o campo do prédio com o tema da final)
  // ==========================================================================
  const CENTER = [53, 14.5];
  // posição dos quatro no gramado (a mesma arrumação da câmera girando da versão 2D)
  const egoPos = (c) => [CENTER[0] + c.pos[1] * 0.009, CENTER[1] + c.pos[0] * 0.009];
  let LINEUP = null;
  function lineup(cast) {
    if (LINEUP && LINEUP.n === cast[0].label) return LINEUP;
    const japan = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
    const france = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#ef4444' };
    const jp = ['rin', 'bachira', 'nagi', 'chigiri', 'kunigami', 'barou', 'shidou', 'gagamaru', 'karasu'].map((id) => CE.cineChar(id, japan));
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = ['#f3d1b8', '#e8b796', '#c98e6a', '#8d5a3b', '#6b4226'];
    const fr = [CE.cineChar('charles', france)];
    for (let i = 0; i < 8; i++) fr.push({ name: 'frances' + i, skinColor: skins[(i * 3) % skins.length], hairColor: ['#1c1917', '#78350f', '#d6b370', '#3f2a1d'][i % 4], eyeColor: '#1e293b', hairStyle: hairs[(i * 5 + 2) % hairs.length], jerseyPrimary: france.jerseyPrimary, jerseySecondary: france.jerseySecondary, number: 2 + i });
    const jpLine = [cast[2].char, ...jp.slice(0, 4), cast[0].char, ...jp.slice(4)];
    const frLine = [fr[0], fr[1], fr[2], cast[1].char, fr[3], fr[4], cast[3].char, fr[5], fr[6], fr[7], fr[8]];
    LINEUP = { n: cast[0].label, jp: jpLine, fr: frLine };
    return LINEUP;
  }

  register('four_egos_intro', {
    phases: [170, 270, 130, 300, 180],
    music: 'epic',
    title: '🎬 FINAL WORLD CUP U-20 • JAPÃO x FRANÇA',
    tags: ['PLANO 1 • A GRANDE FINAL', 'PLANO 2 • A CÂMERA GIRA', "PLANO 3 • 4 EGO'S", 'PLANO 4 • VOCÊ • LOKI • SAE • HUGO', 'PLANO 5 • SÓ UM REINA'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'O estádio inteiro está de pé. Os hinos terminaram.', color: '#94a3b8' }],
      [{ from: 20, who: 'NARRADOR', text: 'Quatro monstros esperam o apito no centro do mundo...', color: '#94a3b8' }],
      [{ from: 24, who: 'NARRADOR', text: 'Quatro egos absolutos dividindo o mesmo gramado.', color: '#94a3b8' }],
      [
        { from: 20, to: 150, text: 'Japão: você e Sae Itoshi. França: Julian Loki e Hugo.' },
        { from: 154, text: 'Cada um acha que o gramado é só dele.' }
      ],
      [{ from: 30, who: 'NARRADOR', text: 'O apito vai soar. Só um ego vai reinar no topo do mundo!', color: '#94a3b8' }]
    ],
    grain: 0,
    vignette: 0.5,
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      const cast = CE.getFourEgosCast();
      if (phase === 0) {
        // o estádio inteiro de pé; os dois times perfilados no meio-campo
        K.expo(1.0);
        const L = lineup(cast);
        L.jp.forEach((c, i) => K.actor(c, { id: 'jp' + i, x: 47.7 + i * 0.47, y: 14.6, ang: Math.PI / 2, frame: 0, k: 0.86 }));
        L.fr.forEach((c, i) => K.actor(c, { id: 'fr' + i, x: 53.6 + i * 0.47, y: 14.6, ang: Math.PI / 2, frame: 0, k: 0.86 }));
        const e = easeIO(k);
        K.cam(K.mix([53, 5.6, 22.6], [53, 1.9, 19.9], e), K.mix([53, 0.2, 12.2], [53, 0.55, 14.4], e), lerp(56, 44, e));
      } else if (phase === 1) {
        // a câmera gira em volta dos quatro
        K.expo(1.0);
        cast.forEach((c, i) => {
          const [x, y] = egoPos(c);
          K.actor(c.char, { id: 'ego' + i, x, y, ang: i % 2 ? -Math.PI / 2 : Math.PI / 2, k: 0.9 });
        });
        const a = 0.9 + t * 0.0118;
        const R = 4.4;
        K.cam([CENTER[0] + Math.cos(a) * R, 1.25, CENTER[1] + Math.sin(a) * R], [CENTER[0], 0.45, CENTER[1]], 46);
      } else if (phase === 2) {
        // impacto: os quatro lado a lado em silhueta, as cores acesas atrás
        K.expo(0.6);
        K.fog('#03050c', 0.06);
        const eye = [53 + K.noise(S.f, 4) * 0.02 * pulse(t, 0, 34), 0.2, 16.9 - ease(seg(t, 0, 130)) * 0.15];
        [[2, 51.65], [0, 52.55], [1, 53.45], [3, 54.35]].forEach(([ci, x], j) => {
          const c = cast[ci];
          const kk = ease(seg(t, 4 + j * 4, 18 + j * 4));
          glowAt(K, x, 14.3, 0.62, 1.7, c.color, 0.55 * kk, eye);
          K.actor(c.char, { id: 'ego' + ci, x, y: 14.5, z: (1 - kk) * -0.25, ang: Math.PI / 2, view: 'front', left: j > 1, k: 0.92, light: [0.07, 0.07, 0.1] });
        });
        K.cam(eye, [53, 0.85, 14.5], 48);
      } else if (phase === 3) {
        // travelling pelos quatro, um de cada vez
        K.expo(1.0);
        const xs = [51.2, 52.4, 53.6, 54.8];
        const cx = lerp(50.7, 55.3, easeIO(seg(t, 0, 300)));
        const eye = [cx, 0.62, 16.35];
        cast.forEach((c, i) => {
          glowAt(K, xs[i], 14.2, 0.55, 1.3, c.color, 0.22, eye);
          K.actor(c.char, { id: 'ego' + i, x: xs[i], y: 14.5, ang: Math.PI / 2, view: 'front', left: i % 2 === 1, k: 0.92, light: mix([1.12, 1.12, 1.12], rgb01(c.color).map((v) => v * 1.3), 0.18) });
        });
        K.cam(eye, [cx + 0.15, 0.58, 14.5], 36);
      } else {
        // os quatro de costas olhando o estádio; os olhos em faixas por cima
        K.expo(0.85);
        const order = [2, 0, 1, 3];
        order.forEach((ci, j) => K.actor(cast[ci].char, { id: 'ego' + ci, x: 51.9 + j * 0.75, y: 15.6, ang: -Math.PI / 2, k: 0.92 }));
        const e = easeIO(k);
        K.cam([53, lerp(0.42, 0.36, e), lerp(18.2, 17.6, e)], [53, 1.25, 8.5], 52);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const cast = CE.getFourEgosCast();
      if (phase === 0) {
        CE.fx2Flashes(ctx, 60, W - 60, top + 20, top + 240, t, 12, 5, 2);
        CE.fx2Kicker(ctx, W / 2, top + 50, 'COPA DO MUNDO SUB-20 • A GRANDE FINAL', seg(t, 4, 46), '#facc15', 'center');
        const kt = seg(t, 18, 30);
        CE.cineImpactText(ctx, 'FINAL WORLD CUP U-20', W / 2, top + 138, 84, '#facc15', kt, W * 0.9);
        if (kt > 0) {
          const lw = 620 * ease(seg(t, 26, 46));
          ctx.fillStyle = '#facc15';
          ctx.fillRect(W / 2 - lw / 2, top + 192, lw, 5);
        }
        CE.cineSfx(S, 18, 'title', () => window.SFX?.kick?.(1));
        const py = bot - 130;
        const plate = (x, w, col, code, label, dir, kk) => {
          if (kk <= 0) return;
          ctx.save();
          ctx.translate((1 - kk) * dir * 700, 0);
          ctx.fillStyle = '#020617';
          ctx.beginPath();
          ctx.moveTo(x - 6, py - 6);
          ctx.lineTo(x + w + 26, py - 6);
          ctx.lineTo(x + w + 6, py + 70);
          ctx.lineTo(x - 26, py + 70);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(x, py);
          ctx.lineTo(x + w + 18, py);
          ctx.lineTo(x + w, py + 64);
          ctx.lineTo(x - 18, py + 64);
          ctx.closePath();
          ctx.fill();
          const fxp = dir < 0 ? x + 14 : x + w - 90;
          CE.fx2Flag(ctx, code, fxp, py + 12, 72, 40, t);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 2;
          ctx.strokeRect(fxp, py + 12, 72, 40);
          CE.fx2Text(ctx, label, dir < 0 ? x + w - 20 : x + 20, py + 33, 'italic 900 38px "Segoe UI", sans-serif', '#ffffff', 1, dir < 0 ? 'right' : 'left');
          ctx.restore();
        };
        plate(W / 2 - 410, 320, '#1d4ed8', 'jp', 'JAPÃO', -1, ease(seg(t, 60, 78)));
        plate(W / 2 + 90, 320, '#0b1d4d', 'fr', 'FRANÇA', 1, ease(seg(t, 66, 84)));
        CE.cineImpactText(ctx, 'VS', W / 2, py + 32, 54, '#facc15', seg(t, 82, 92));
      } else if (phase === 1) {
        CE.cineSfx(S, 0, 'whoosh', () => window.SFX?.whoosh?.());
        // placas com o nome em cima de cada um; o mais perto ganha o nome grande embaixo
        const eye = K.c && K.c.eye;
        let best = null;
        cast.forEach((c, i) => {
          const [x, y] = egoPos(c);
          const p = spot(K, x, y, 0, 0.9, -2);
          const d = eye ? Math.hypot(eye[0] - x, eye[2] - y) : i;
          if (!best || d < best.d) best = { c, i, d };
          if (!p || p.x < -60 || p.x > W + 60) return;
          ctx.save();
          ctx.font = '900 13px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const tw = ctx.measureText(c.label).width + 14;
          ctx.fillStyle = 'rgba(2,6,23,0.8)';
          ctx.fillRect(p.x - tw / 2, p.y - 10, tw, 20);
          ctx.fillStyle = c.color;
          ctx.fillRect(p.x - tw / 2, p.y + 9, tw, 2);
          ctx.fillText(c.label, p.x, p.y);
          ctx.restore();
        });
        CE.cineDust(ctx, W, H * 0.8, t, 20, 'rgba(219,234,254,0.4)', 13);
        if (best) {
          if (!this._f3Close || this._f3Close.run !== CE._cineRun || t < this._f3Close.at) this._f3Close = { i: best.i, at: 0, run: CE._cineRun };
          else if (this._f3Close.i !== best.i) this._f3Close = { i: best.i, at: t, run: CE._cineRun };
          const ka = seg(t, this._f3Close.at, this._f3Close.at + 12);
          const c = cast[this._f3Close.i];
          ctx.fillStyle = 'rgba(2,6,23,0.72)';
          ctx.fillRect(0, bot - 104, 560 * ease(ka), 84);
          ctx.fillStyle = c.color;
          ctx.fillRect(0, bot - 104, 8, 84);
          CE.fx2Word(ctx, c.label, 36, bot - 74, 46, c.color, ka, 1, -0.03, 500, 'left');
          CE.fx2Text(ctx, c.role, 40, bot - 38, '900 15px "Segoe UI", sans-serif', '#e2e8f0', seg(t, this._f3Close.at + 6, this._f3Close.at + 18), 'left', true);
        }
      } else if (phase === 2) {
        CE.cineSfx(S, 0, 'impact', () => window.SFX?.kick?.(1));
        // os quatro cortes coloridos saindo do centro
        cast.forEach((c, i) => {
          const a = -Math.PI / 2 + (i - 1.5) * 0.55 + Math.sin(t * 0.02 + i) * 0.02;
          const kk = ease(seg(t, 2 + i * 3, 14 + i * 3));
          ctx.save();
          ctx.strokeStyle = c.color;
          ctx.lineWidth = 14;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(W / 2 + Math.cos(a + Math.PI) * 40, top + 150 + Math.sin(a + Math.PI) * 40);
          ctx.lineTo(W / 2 + Math.cos(a + Math.PI) * 40 * (1 + kk * 30), top + 150 + Math.sin(a + Math.PI) * 40 * (1 + kk * 30));
          ctx.stroke();
          ctx.restore();
        });
        // os olhos de cada um acendem na silhueta, na cor do ego
        [[2, 51.65], [0, 52.55], [1, 53.45], [3, 54.35]].forEach(([ci, x], j) => {
          const c = cast[ci];
          const open = seg(t, 46 + j * 6, 54 + j * 6);
          if (open <= 0) return;
          const kk = ease(seg(t, 4 + j * 4, 18 + j * 4));
          const p = spot(K, x, 14.5, (1 - kk) * -0.25, 0.92, EYE_V());
          if (!p) return;
          const real = CE.cineSpriteEyes(ctx, c.char, p.x, p.y, p.u, { full: true, aura: c.color, expr: 'angry', blink: open < 0.5, eyeU: MAPY(10.25), mirror: j > 1 });
          [-1, 1].forEach((s) => {
            const ex = p.x + s * 3.45 * p.u;
            CE.cineGlow(ctx, ex, p.y, p.u * 4, 'rgba(255,255,255,0.25)', open);
            if (!real) CE.drawPixelEye(ctx, ex, p.y, p.u * 0.26, { line: '#000000', white: '#f8fafc', iris: '#020617', ring: c.color, look: j > 1 ? -1 : 1, blink: open < 0.5 });
          });
        });
        CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, 0, 9)));
        CE.cineImpactText(ctx, "4 EGO'S", W / 2, top + 150, 170, '#f8fafc', seg(t, 6, 18), W * 0.86);
        const lw = 520 * ease(seg(t, 16, 34));
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(W / 2 - lw / 2, top + 242, lw, 6);
      } else if (phase === 3) {
        // a placa com o nome de quem está na frente da câmera
        const xs = [51.2, 52.4, 53.6, 54.8];
        const cx = lerp(50.7, 55.3, easeIO(seg(t, 0, 300)));
        cast.forEach((c, i) => {
          const d = Math.abs(cx + 0.15 - xs[i]);
          const pk = ease(clamp((1.05 - d) / 0.45));
          if (pk <= 0) return;
          CE.cineSfx(S, Math.max(0, Math.round(i * 73 - 20)), 'pan' + i, () => window.SFX?.whoosh?.());
          const p = K.screen(xs[i], 0.4, 14.5);
          const px = p ? p.x : W / 2;
          const pw = 380;
          const x0 = px - pw / 2;
          ctx.save();
          ctx.globalAlpha = pk;
          ctx.fillStyle = 'rgba(2,6,23,0.88)';
          ctx.fillRect(x0, bot - 104, pw * pk, 76);
          ctx.fillStyle = c.color;
          ctx.fillRect(x0, bot - 104, pw * pk, 3);
          ctx.restore();
          CE.fx2Word(ctx, c.label.slice(0, 16), px, bot - 76, 30, c.color, pk, 1, -0.04, pw - 40);
          CE.fx2Text(ctx, c.role, px, bot - 44, '800 12px "Segoe UI", sans-serif', '#e2e8f0', pk);
        });
      } else {
        // os olhos dos quatro em faixas
        const gap = 26;
        const sh = Math.min(96, (bot - top - 28 - gap * 3) / 4);
        const y00 = (top + bot) / 2 - (sh * 4 + gap * 3) / 2;
        [0, 1, 2, 3].forEach((ci, j) => {
          const c = cast[ci];
          const kk = ease(seg(t, j * 10, j * 10 + 16));
          if (kk <= 0) return;
          const y0 = y00 + j * (sh + gap);
          const y1 = y0 + sh;
          const dir = j % 2 ? 1 : -1;
          CE.fx2Panel(
            ctx,
            [[20, y0], [W - 20, y0 - 6], [W - 20, y1 - 6], [20, y1]],
            () => {
              ctx.fillStyle = '#04060d';
              ctx.fillRect(0, y0 - 10, W, sh + 20);
              const dw = 430 + t * 0.35;
              const U = dw / 14;
              const cx = W / 2 + (j % 2 ? 90 : -90) + dir * (1 - ease(seg(t, j * 10, 170))) * 40;
              const cy = (y0 + y1) / 2 - 3;
              CE.fx2Crop(ctx, c.char, {}, 11, 7, 14, 6, cx - dw / 2, cy - 3.25 * U, dw, 6 * U);
              const eye = c.char.eyeColor || '#0f766e';
              const real = CE.cineSpriteEyes(ctx, c.char, cx, cy - 0.15 * U, U, { expr: 'angry' });
              [14.55, 21.45].forEach((ux, e) => {
                const ex = cx - dw / 2 + (ux - 11) * U;
                if (!real) CE.drawPixelEye(ctx, ex, cy, U * 0.27, { line: '#020617', iris: CE.fx2Shade(eye, -0.5), ring: eye, look: j % 2 ? -1 : 1 });
                if (!real) CE.fx2Angry(ctx, ex, cy, U * 0.27, e === 0 ? 1 : -1, '#020617');
              });
              ctx.fillStyle = `rgba(2,6,23,${0.25 + seg(t, 96, 116) * 0.45})`;
              ctx.fillRect(0, y0 - 10, W, sh + 20);
              const nx = j % 2 ? W - 44 : 44;
              ctx.fillStyle = c.color;
              ctx.fillRect(j % 2 ? W - 28 : 20, y0, 8, sh);
              CE.fx2Text(ctx, c.label, nx, y0 + 24, 'italic 900 22px "Segoe UI", sans-serif', c.color, ease(seg(t, j * 10 + 10, j * 10 + 22)), j % 2 ? 'right' : 'left');
            },
            { dx: (1 - kk) * dir * W, width: 4 }
          );
        });
        CE.fx2Kicker(ctx, W / 2, H / 2 - 74, 'FINAL WORLD CUP U-20 • JAPÃO x FRANÇA', seg(t, 104, 116), '#facc15', 'center');
        CE.cineImpactText(ctx, 'SÓ UM EGO VAI REINAR.', W / 2, H / 2 + 6, 78, '#f8fafc', seg(t, 112, 124), W * 0.9);
        CE.cineSfx(S, 150, 'whistle', () => window.SFX?.whistle?.(1));
      }
    }
  });
})();
