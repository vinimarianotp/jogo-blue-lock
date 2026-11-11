// ============================================================================
// CUTSCENES EM 3D — o Fox e a final contra a França: fox_entrance • fox_watch • four_egos_intro
// Refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js): grua, travelling, push-in, câmera
// lenta com rampa, um quadro de impacto no máximo, closes só em quadros de mangá em pixel
// art (mão, chuteira, bola) e pouco texto. O dono do jogo não quer close do Fox (o boneco de
// 72 px ampliado vira blocos): ele aparece só em planos médios e abertos.
// A caixa de ferramentas (CE.foxFx) vem do js/cine3d_fox.js; os ajudantes 2D do Fox (sorriso,
// olhos, dedo) do js/cine_fox2.js (CE.fx2*).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE.foxFx) return;
  const FX = CE.foxFx;
  const { clamp, seg, ease, easeIO, lerp, mixP, rnd, pulse, remap, cam, act, ball, shake, scr, TOWERS, LAMP_Z } = FX;
  const CAa = () => CE.ART;
  const PIX = 6; // tamanho do pixel dos quadros de mangá (a escala dos bonecos)
  const FOX_COLOR = '#f59e0b';
  const YOU_COLOR = '#00f5d4';
  const NARR = '#94a3b8';
  // altura (unidades do quadro de 36) dos olhos e da boca do Fox
  const FOX_EYE = 11.2;
  const FOX_MOUTH = 14.3;
  const MAPY = (y) => (window.SPRITE_MAPY ? window.SPRITE_MAPY(y) : y);

  // Onde fica na tela a unidade v do quadro do boneco (0 = topo, 33 = chão) de um ator em
  // (x, y, z) com escala k: { x, y, u } (u = 1 unidade da arte em px)
  function spot(K, x, y, z = 0, k = 0.9, v = 0) {
    const h = (72 / 66) * k;
    const a = K.screen(x, z + (h * (33 - v)) / 36, y);
    const b = K.screen(x, z + (h * (34 - v)) / 36, y);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, u: a.y - b.y };
  }
  // várias caixas iguais numa peça só (um desenho por quadro em vez de dezenas)
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
  // brilho redondo em pé virado para a câmera (luz de fundo colorida)
  function glowAt(K, x, y, z, s, color, alpha) {
    FX.faceCam(K, { x, y, z: z - s / 2, w: s, h: s, img: FX.glowCv('255,255,255'), color, alpha, em: true });
  }

  // ---------------------------------------------------------------- quadros de mangá
  // a mão do Fox com o indicador para cima, desenhada direto na grade (u = 1 "pixel" da mão,
  // múltiplo do pixel do quadro): dedo, polegar, os dedos dobrados, punho da camisa e a manga
  function foxHand(g, cx, tipY, u) {
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(cx + x * u, tipY + y * u, w * u, h * u);
    };
    const INK = '#0c0a09';
    const SKIN = '#d6a77a';
    const SK2 = '#b07d55';
    // contorno
    R(-2, -1, 4, 9, INK);
    R(-5, 6, 10, 9, INK);
    R(-6, 8, 3, 5, INK);
    R(-6, 14, 12, 12, INK);
    // indicador (com a unha e o brilho)
    R(-1, 0, 2, 8, SKIN);
    R(-1, 0, 1, 8, '#e8bf94');
    R(-1, 1, 2, 1, '#f1d2b1');
    // punho: os três dedos dobrados (faixas) e o polegar por cima
    R(-4, 7, 8, 7, SKIN);
    R(-4, 9, 8, 1, SK2);
    R(-4, 11, 8, 1, SK2);
    R(3, 7, 1, 7, SK2);
    R(-5, 9, 3, 3, SKIN);
    R(-5, 11, 3, 1, SK2);
    // punho da camisa e a manga do terno
    R(-5, 14, 10, 2, '#f5f5f4');
    R(-5, 16, 10, 10, '#1e2235');
    R(-5, 16, 2, 10, '#2c3150');
    R(3, 16, 2, 10, '#11131f');
  }
  // o giro do dedo: um anel de quadradinhos girando em volta da ponta (elipse achatada)
  function twirlRing(g, cx, cy, u, q) {
    g.fillStyle = '#fde68a';
    for (let i = 0; i < 14; i++) {
      const a = -q * 18 + i * 0.32;
      const fade = 1 - i / 14;
      g.globalAlpha = fade;
      g.fillRect(cx + Math.round(Math.cos(a) * 6) * u - u / 2, cy + Math.round(Math.sin(a) * 2) * u - u / 2, u, u);
    }
    g.globalAlpha = 1;
  }
  function cutTwirl(ctx, S, kIn, q, poly, from, bg = '#1c0606') {
    const CA = CAa();
    if (!CA) return;
    CA.panel(
      ctx,
      poly,
      (b, g) => {
        g.fillStyle = bg;
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.halftone(g, b.x, b.y, b.w, b.h, { step: 22, color: 'rgba(127,29,29,0.55)', from: 'bottom' });
        const u = Math.max(PIX, Math.round(b.h / 34 / PIX) * PIX);
        const cx = Math.round((b.x + b.w * 0.5 + b.ox) / PIX) * PIX;
        const tipY = Math.round((b.y + b.h * 0.3) / PIX) * PIX;
        twirlRing(g, cx, tipY - u, u, q);
        foxHand(g, cx, tipY, u);
      },
      { k: kIn, from, pixel: PIX }
    );
  }
  // a chuteira de alguém na bola, com as linhas e a cor do personagem (o "golpe" de cada ego)
  function cutWeapon(ctx, S, kIn, q, poly, from, o) {
    const CA = CAa();
    if (!CA) return;
    CA.panel(
      ctx,
      poly,
      (b, g) => {
        g.fillStyle = o.bg || '#e2e8f0';
        g.fillRect(b.x, b.y, b.w, b.h);
        const bx = b.x + b.w * 0.62 + b.ox;
        const by = b.y + b.h * 0.5;
        if (o.kind === 'speed') CA.speedLines(g, Math.PI, S.W, S.H, { color: o.lines, n: 34, t: q * 60, speed: 40, thick: 7 });
        else CA.speedRadial(g, bx, by, S.W, S.H, { color: o.lines, inner: b.h * 0.24, n: 50, thick: 1.6 });
        CA.halftone(g, b.x, b.y, b.w, b.h, { step: 18, color: 'rgba(15,23,42,0.35)', from: 'bottom' });
        if (o.kind === 'curve') {
          // o passe: a curva tracejada que a bola vai fazer
          g.save();
          g.strokeStyle = o.accent;
          g.lineWidth = b.h * 0.035;
          g.setLineDash([b.h * 0.08, b.h * 0.06]);
          g.beginPath();
          g.moveTo(bx, by);
          g.quadraticCurveTo(b.x + b.w * 0.9, b.y + b.h * 0.05, b.x + b.w * 1.05, b.y + b.h * 0.55);
          g.stroke();
          g.restore();
        }
        g.fillStyle = o.accent;
        g.globalAlpha = 0.35;
        g.beginPath();
        g.arc(bx, by, b.h * 0.24, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        CA.ball(g, bx, by, b.h * 0.17, { rot: q * 4 });
        // a perna entra por baixo e o peito do pé encosta na bola
        const e = easeIO(q * 1.3);
        const s = b.h * 0.2;
        CA.boot(g, bx - s * 1.9 - (1 - e) * b.w * 0.25, by + s * 0.55 + (1 - e) * b.h * 0.35, s, { sock: o.sock, sock2: o.sock2, boot: o.boot, ang: lerp(0.8, -0.12, e) });
      },
      { k: kIn, from, pixel: PIX }
    );
  }

  // ==========================================================================
  // 1) A ENTRADA DO FOX — o campo do Blue Lock de madrugada (onde a conversa acontece)
  // ==========================================================================
  const YOU_AT = [53.3, 11.3];
  const FOX_AT = [59.95, 14.5, 0.44]; // de pé no 2º degrau da arquibancada do lado leste
  const OFF = [2, 3, 1, 0]; // ordem em que as torres apagam (índices de TOWERS): as do sul primeiro
  const OFF_AT = [24, 50, 76, 102];
  const offAt = (i) => OFF_AT[OFF.indexOf(i)];
  // o 2º chute do plano 1 em câmera lenta (rampa: entra e sai suave)
  const P0_KEYS = [[0, 0], [116, 116], [160, 132], [180, 152]];
  const KICKS = [40, 124];

  // a arquibancada do lado leste (3 degraus e as cadeiras)
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
  // a cabeça de cada refletor apagado (o filamento esfria em laranja)
  function lampsOff(K, t, phase) {
    TOWERS.forEach(([x, y], i) => {
      const at = offAt(i);
      const off = phase > 1 || (phase === 1 && t >= at);
      if (!off) return;
      const cool = phase === 1 ? 1 - seg(t, at, at + 30) : 0;
      const col = cool > 0 ? mixP([0.07, 0.08, 0.12], [0.98, 0.57, 0.24], cool) : [0.05, 0.06, 0.09];
      K.box({ x0: x - 0.47, y0: y - 0.22, x1: x + 0.47, y1: y + 0.22, z0: 3.08, z1: 3.57, color: col, em: true });
    });
  }
  // a sua bola do 2º chute (tempo da ação A)
  const kickFlight = (A, kt, dur) => {
    const q = (A - kt) / dur;
    const e = ease(q);
    return [lerp(YOU_AT[0] + 0.12, 53.1, e), lerp(YOU_AT[1] - 0.25, 6.45, e), 0.09 + Math.sin(clamp(q) * Math.PI) * 0.7 + e * 0.22];
  };

  CE.registerCine3D('fox_entrance', {
    phases: [180, 170, 190, 200, 170],
    music: 'dread',
    title: '🦊 A ENTRADA DO FOX',
    tags: ['PLANO 1 • MADRUGADA NO BLUE LOCK', 'PLANO 2 • AS LUZES', 'PLANO 3 • O SORRISO', 'PLANO 4 • A RAPOSA', 'PLANO 5 • NINGUÉM SABE'],
    subs: [
      [{ from: 6, who: 'VOCÊ', text: '(Mais um. Até esquecer como se erra.)', color: YOU_COLOR }],
      [{ from: 112, who: 'VOCÊ', text: '"...Quem tá aí?"', color: YOU_COLOR }],
      [{ from: 24, text: 'No escuro, alguém está rindo.' }],
      [{ from: 70, who: 'FOX', text: '"Boa noite, campeão."', color: FOX_COLOR }],
      [{ from: 8, text: 'Quem descobre o que ele quer... muda.', color: '#fca5a5' }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const fox = CE.fx2Fox();
      const st = (K.st = {});
      eastStands(K);
      lampsOff(K, t, phase);
      const offN = phase === 0 ? 0 : phase === 1 ? OFF_AT.filter((a) => t >= a).length : 4;
      if (offN > 0) K.c.noLights = true;
      if (phase === 0) {
        // A GRUA: do alto do campo vazio até atrás de você, chutando sozinho de novo e de novo
        K.expo(0.92);
        const A = remap(t, P0_KEYS);
        let anim = 'idle';
        let fly = null;
        let inNet = 3;
        KICKS.forEach((kt, i) => {
          if (A >= kt - 14 && A < kt) anim = 'windup';
          else if (A >= kt && A < kt + 16) anim = 'shoot';
          const dur = i ? 26 : 22;
          if (A >= kt && A < kt + dur) fly = kickFlight(A, kt, dur);
          if (A >= kt + dur) inNet++;
        });
        act(K, 'you', YOU_AT, { id: 'y', face: [53, 6.4], anim, frame: anim === 'idle' ? 0 : 1, kit: 'blueLock' });
        [[52.55, 11.85], [52.95, 12.3], [54.2, 11.95], [51.7, 12.6]].forEach(([x, y]) => K.ball(x, y, 0.09));
        for (let i = 0; i < inNet; i++) K.ball(52.35 + i * 0.3, 6.32 + (i % 2) * 0.14, 0.09);
        if (fly) ball(K, fly);
        else if (A < KICKS[1] + 1) K.ball(YOU_AT[0] + 0.14, YOU_AT[1] - 0.28, 0.09);
        // as quatro sombras dos refletores em volta dos seus pés
        TOWERS.forEach((tw) => FX.shadowFrom(K, tw, YOU_AT, 0.9, 0.34, 0.2));
        const k = easeIO(seg(t, 0, 150));
        const push = easeIO(seg(t, 110, 180));
        cam(K, mixP(mixP([58.6, 20.8, 4.4], [56.0, 14.6, 0.62], k), [55.6, 14.1, 0.58], push), mixP([53.2, 10.6, 0.2], [53.0, 8.4, 0.5], k), lerp(lerp(58, 44, k), 40, push));
        st.ball = fly ? { __w: fly } : null;
        st.A = A;
      } else if (phase === 1) {
        // AS LUZES: de frente para você; as torres do fundo apagam, depois as de trás da
        // câmera — cada sombra sua some junto com a torre dela
        const lit = 1 - offN / 4;
        K.expo(lerp(0.95, 0.4, offN / 4) - seg(t, 102, 140) * 0.06);
        const turned = t >= 108;
        act(K, 'you', YOU_AT, { id: 'y', face: turned ? [FOX_AT[0], FOX_AT[1]] : [53, 6.4], frame: 0, kit: 'blueLock', light: mixP([0.14, 0.17, 0.3], [1, 1, 1], lit) });
        for (let i = 0; i < 6; i++) K.ball(52.35 + i * 0.3, 6.32 + (i % 2) * 0.14, 0.09, { light: mixP([0.18, 0.2, 0.3], [1, 1, 1], lit) });
        TOWERS.forEach((tw, i) => {
          if (t < offAt(i)) FX.shadowFrom(K, tw, YOU_AT, 0.9, 0.34, 0.22);
        });
        if (offN === 4) K.fog('#02040a', 0.05);
        const punch = OFF_AT.reduce((s, a) => s + pulse(t, a, 12), 0);
        const k = easeIO(t / 170);
        cam(K, shake(K, [lerp(52.15, 52.45, k), lerp(8.3, 8.75, k), lerp(0.4, 0.46, k)], f, 0.004 + punch * 0.006, 3), [53.45, 13.0, lerp(0.8, 0.7, k)], lerp(58, 52, k));
      } else if (phase === 2) {
        // O SORRISO: no escuro, do seu lugar no campo para a arquibancada — só os olhos e o
        // sorriso de alguém lá em cima (plano aberto: o Fox pequeno no escuro)
        K.expo(0.34);
        K.fog('#030104', 0.05);
        act(K, fox, FOX_AT, { id: 'fox', ang: Math.PI, view: 'front', k: 0.95, light: [0.16, 0.06, 0.07] });
        const k = easeIO(t / 190);
        const laugh = [52, 92, 130, 160].reduce((s, a) => s + pulse(t, a, 22), 0);
        cam(K, shake(K, [lerp(54.4, 55.2, k), lerp(12.2, 12.75, k), 0.62], f, 0.003 + laugh * 0.004, 5), [FOX_AT[0], FOX_AT[1] - 0.1, FOX_AT[2] + 0.62], lerp(40, 34, k));
      } else if (phase === 3) {
        // A RAPOSA: o holofote acende em cima dele; de baixo, a grua sobe devagar
        K.expo(0.62);
        K.fog('#020308', 0.035);
        const on = seg(t, 0, 3);
        const k = easeIO(seg(t, 6, 200));
        const eye = mixP([57.0, 15.95, 0.3], [57.55, 15.25, 0.62], k);
        act(K, fox, FOX_AT, { id: 'fox', ang: Math.PI, view: 'front', k: 0.95, light: mixP([0.1, 0.05, 0.06], [1.3, 1.34, 1.45], on) });
        // o cone do holofote e a poça de luz no degrau
        FX.faceCam(K, { x: FOX_AT[0] + 0.05, y: FOX_AT[1], z: FOX_AT[2] - 0.05, w: 1.5, h: 4.2, img: FX.coneCv(), color: '#dbeafe', alpha: 0.3 * on, em: true });
        K.floor({ x0: FOX_AT[0] - 0.85, y0: FOX_AT[1] - 0.85, x1: FOX_AT[0] + 0.85, y1: FOX_AT[1] + 0.85, z: FOX_AT[2] + 0.004, img: FX.glowCv('224,242,254'), em: true, alpha: 0.55 * on });
        const sh = t < 26 ? 0.03 * (1 - t / 26) : 0.003;
        cam(K, shake(K, eye, f * 2, sh, 6), [FOX_AT[0], FOX_AT[1] + 0.05, lerp(0.98, 1.05, k)], lerp(46, 42, k));
      } else {
        // NINGUÉM SABE: o contraplano — atrás dele, lá do alto; você pequeno no campo apagado
        K.expo(0.5);
        K.fog('#020104', 0.045);
        act(K, fox, FOX_AT, { id: 'fox', ang: Math.PI, view: 'back', k: 0.95, light: [0.55, 0.5, 0.6] });
        act(K, 'you', YOU_AT, { id: 'y', face: [FOX_AT[0], FOX_AT[1]], frame: 0, kit: 'blueLock', light: [0.55, 0.6, 0.8] });
        K.floor({ x0: YOU_AT[0] - 1, y0: YOU_AT[1] - 1, x1: YOU_AT[0] + 1, y1: YOU_AT[1] + 1, img: FX.glowCv('191,219,254'), em: true, alpha: 0.28 });
        FX.faceCam(K, { x: FOX_AT[0] + 0.05, y: FOX_AT[1], z: FOX_AT[2] - 0.05, w: 1.5, h: 4.2, img: FX.coneCv(), color: '#dbeafe', alpha: 0.22, em: true });
        const k = easeIO(t / 170);
        cam(K, mixP([60.85, 17.0, 1.55], [60.85, 17.7, 2.25], k), mixP([55.6, 12.4, 0.45], [54.6, 11.9, 0.3], k), lerp(48, 54, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = {};
      Object.keys(K.st || {}).forEach((k) => {
        const v = K.st[k];
        st[k] = v && v.__w ? scr(K, v.__w) : v;
      });
      if (phase === 0) {
        FX.flares(ctx, K, S, 0.8);
        KICKS.forEach((kt) => CE.cineSfx(S, kt === KICKS[0] ? kt : 138, 'kick' + kt, () => window.SFX?.kick?.(0.75)));
        // a bola em câmera lenta com o rastro
        if (st.ball && st.A > KICKS[1]) CE.cineGlow(ctx, st.ball.x, st.ball.y, 40, 'rgba(255,255,255,0.45)', 0.8);
        FX.pxDust(ctx, W, top, bot, t, 26, 'rgba(219,234,254,0.35)', 3, 7);
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • 03:12 DA MADRUGADA', seg(t, 8, 40), '#38bdf8');
        CE.luckKicker(ctx, 40, top + 64, 'UMA SEMANA DEPOIS DO TÍTULO', seg(t, 30, 64), '#facc15');
      } else if (phase === 1) {
        FX.flares(ctx, K, S, 0.9, TOWERS, (i) => (t < offAt(i) ? 1 : 0));
        // o filamento esfriando em cada torre que apaga (e o barulho seco)
        TOWERS.forEach(([x, y], i) => {
          const a = t - offAt(i);
          if (a < 0 || a > 34) return;
          const p = K.screen(x, 3.4, y);
          if (p) CE.cineGlow(ctx, p.x, p.y, 80, 'rgba(251,146,60,0.55)', 1 - a / 34);
          CE.cineSfx(S, offAt(i), 'clack' + i, () => window.SFX?.tackle?.());
        });
        FX.dim(ctx, W, H, seg(t, 102, 150) * 0.25);
      } else if (phase === 2) {
        // os olhos e o sorriso do Fox no escuro (no tamanho do boneco: plano aberto)
        const f = spot(K, FOX_AT[0], FOX_AT[1], FOX_AT[2], 0.95, FOX_EYE);
        const laugh = [52, 92, 130, 160].reduce((s, a) => s + pulse(t, a, 22), 0);
        const bob = Math.round(Math.sin(t * 0.5) * laugh * 1.5);
        if (f) {
          CE.cineGlow(ctx, f.x, f.y, f.u * 22, 'rgba(127,29,29,0.5)', 0.2 + seg(t, 40, 190) * 0.5);
          CE.fx2FoxEyes(ctx, f.x, f.y + bob, f.u, seg(t, 30, 40), { glow: 'rgba(254,226,226,0.25)' });
          CE.fx2Grin(ctx, f.x, f.y + (FOX_MOUTH - FOX_EYE) * f.u + bob, 9 * f.u, ease(seg(t, 62, 100)));
        }
        [52, 92, 130, 160].forEach((a, i) => CE.cineSfx(S, a, 'riso' + i, () => window.SFX?.whoosh?.()));
        // a mão dele girando o dedo (quadro de mangá em pixel art, no canto)
        if (t > 112 && t < 182) cutTwirl(ctx, S, seg(t, 112, 122), seg(t, 112, 182), [[W * 0.06, bot - 290], [W * 0.36, bot - 314], [W * 0.38, bot - 24], [W * 0.04, bot - 24]], [-260, 0]);
      } else if (phase === 3) {
        // o holofote: quadro de impacto (1 quadro), clarão curto e a poeira no feixe
        if (t < 1.5) FX.impactFrame(ctx, W, H);
        CE.cineFlash(ctx, W, H, 0.75 * (1 - seg(t, 1, 9)), '#e0f2fe');
        CE.cineSfx(S, 0, 'spot', () => window.SFX?.post?.());
        const p = spot(K, FOX_AT[0], FOX_AT[1], FOX_AT[2], 0.95, 0);
        if (p) {
          CE.cineGlow(ctx, p.x, p.y - 30, 220, 'rgba(219,234,254,0.16)', 1);
          FX.pxDust(ctx, W, top, p.y + p.u * 34, t, 34, 'rgba(219,234,254,0.55)', 3, 11, 0.12);
        }
        const f = spot(K, FOX_AT[0], FOX_AT[1], FOX_AT[2], 0.95, FOX_MOUTH);
        if (f) CE.fx2Grin(ctx, f.x, f.y, 8.6 * f.u, ease(seg(t, 40, 70)));
        CE.luckKicker(ctx, 40, bot - 70, 'FOX • EX-TÉCNICO DA INGLATERRA SUB-20', seg(t, 96, 130), FOX_COLOR);
      } else {
        FX.pxDust(ctx, W, top, bot, t, 22, 'rgba(219,234,254,0.3)', 3, 13, 0.1);
        FX.dim(ctx, W, H, seg(t, 128, 168));
      }
    }
  });

  // ==========================================================================
  // 2) O FOX NA ARQUIBANCADA INGLESA — o rosto NUNCA aparece (só o sorriso). A arquibancada
  // e o campo da semifinal montados na área vazia (K.VOID): ele olha o jogo lá embaixo
  // ==========================================================================
  // arquibancada virada para o sul (o campo fica ao sul dela)
  const VX = 86;
  const VY = 17;
  const ROWS = 5;
  const rowY = (r) => VY + 0.6 - r * 0.85; // borda da frente do degrau
  const rowZ = (r) => 0.18 + r * 0.36; // altura do degrau
  const FOXW = [VX + 0.6, rowY(2) - 0.2, rowZ(2)]; // sentado na beirada do degrau 2
  // o campo lá embaixo (você furando a defesa inglesa)
  const PITCH_Y = VY + 1.6;
  const youRun = (A) => [lerp(VX - 3.6, VX + 3.2, A / 220), PITCH_Y + 4.6 + Math.sin(A * 0.03) * 0.35, 0];
  const ENG = [[VX - 1.2, PITCH_Y + 4.2], [VX + 0.4, PITCH_Y + 5.1], [VX + 1.9, PITCH_Y + 4.4], [VX + 0.9, PITCH_Y + 6.6]];
  const P1_KEYS = [[0, 0], [118, 118], [176, 140], [220, 184]];
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
      for (let i = 0; i < 13; i++) {
        const x = VX - 6.4 + i * 1.04 + (r % 2) * 0.5 + (rnd(i, r) - 0.5) * 0.2;
        if (r === 2 && Math.abs(x - FOXW[0]) < 0.6) continue; // o lugar dele
        if (r === 1 && Math.abs(x - FOXW[0]) < 2.4) continue; // a frente dele livre
        // (a 1ª fileira, perto da câmera que chega nele, ficava enorme e cortada na frente)
        if (r === 0 && Math.abs(x - FOXW[0]) < 3.4) continue;
        const q = Math.floor(rnd(i, r + 11) * 997);
        FANS.push({
          x,
          y: rowY(r) - 0.42,
          z: rowZ(r),
          r,
          ph: rnd(i, r + 7) * 6,
          arms: rnd(i, r + 3) < 0.55,
          cd: { name: 'torcedor' + r + '_' + i, skinColor: skins[q % skins.length], hairColor: cols[(q >> 2) % cols.length], hairSecondary: cols[(q >> 4) % cols.length], eyeColor: '#1e293b', hairStyle: hairs[(q >> 3) % hairs.length], outfit: 'casual', clothesColor: shirts[(q >> 5) % shirts.length], jerseyPrimary: '#f8fafc', jerseySecondary: '#dc2626' }
        });
      }
    }
    return FANS;
  }
  const ENG_KIT = { jerseyPrimary: '#f8fafc', jerseySecondary: '#1e3a8a' };
  let ENG_CHARS = null;
  const engChars = () => ENG_CHARS || (ENG_CHARS = ['chris_prince', 'agi', 'teddy', 'blake'].map((id, i) => Object.assign({ name: 'ingles' + i, skinColor: '#f3d1b8', hairColor: ['#d6b370', '#1c1917', '#78350f', '#a16207'][i], eyeColor: '#1e293b', hairStyle: 'short_sharp' }, (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || {}, ENG_KIT)));
  function englishStands(K, t, cheer, eye, near = 0) {
    K.sky('#01030b', '#0a1430', 0.3);
    K.fog('#050a1a', 0.05);
    K.ambient('#8ea2cf');
    const steps = [];
    for (let r = 0; r < ROWS + 1; r++) steps.push({ x0: VX - 9, y0: rowY(r) - 0.85, x1: VX + 9, y1: rowY(r), z0: 0, z1: rowZ(r) });
    boxes(K, steps, { color: '#0c1730', top: '#13254a', light: [0.7, 0.75, 0.95] });
    boxes(K, [0, 1, 2, 3, 4].map((r) => ({ x0: VX - 9, y0: rowY(r) - 0.04, x1: VX + 9, y1: rowY(r), z0: rowZ(r), z1: rowZ(r) + 0.05 })), { color: '#b91c1c', light: [0.8, 0.8, 0.9] });
    // o anel de cima pintado (torcida de longe, faixas) e os refletores da cobertura
    const bg = FX.once('engstands', 1480, 400, (g, w, h) => CE.fx2BgEngStands(g, w, h));
    K.quad({ x: VX, y: rowY(ROWS) - 1.2, z: rowZ(ROWS) - 0.4, w: 26, h: 6.5, ang: -Math.PI / 2, img: bg, light: [1.2, 1.2, 1.3] });
    for (let i = 0; i < 10; i++) glowAt(K, VX - 11 + i * 2.5, rowY(ROWS) - 1.05, rowZ(ROWS) + 4.8, 1.5, '#dbeafe', 0.7);
    englishFans().forEach((fn, i) => {
      // (quem fica colado na câmera ou entre ela e o Fox sai do quadro: vira mancha na frente)
      if (near && Math.hypot(fn.x - eye[0], fn.y - eye[1]) < near) return;
      const kk = (fn.y - FOXW[1]) / (eye[1] - FOXW[1]);
      if (near && kk > 0 && kk < 1 && Math.abs(fn.x - lerp(FOXW[0], eye[0], kk)) < 0.5) return;
      const jump = cheer * Math.max(0, Math.sin(t * 0.22 + fn.ph)) * 0.09;
      K.actor(fn.cd, { id: 'f' + i, x: fn.x, y: fn.y, z: fn.z + jump, ang: Math.PI / 2, anim: cheer > 0 && fn.arms ? 'call_pass' : 'idle', frame: 0, k: 0.88, left: rnd(i, 5) < 0.5, light: [0.62, 0.68, 0.92] });
    });
  }
  // o campo da semifinal ao sul da arquibancada (gramado, linhas, a outra arquibancada lá longe)
  function pitch(K) {
    K.floor({ x0: VX - 12, y0: rowY(0) - 0.1, x1: VX + 12, y1: PITCH_Y, z: 0.004, color: '#0b1120' });
    K.floor({ x0: VX - 12, y0: PITCH_Y, x1: VX + 12, y1: PITCH_Y + 14, z: 0.004, color: '#15803d' });
    for (let i = 0; i < 6; i++) K.floor({ x0: VX - 12, y0: PITCH_Y + 0.4 + i * 2.2, x1: VX + 12, y1: PITCH_Y + 1.5 + i * 2.2, z: 0.006, color: '#16a34a' });
    boxes(K, [{ x0: VX - 12, y0: PITCH_Y + 0.6, x1: VX + 12, y1: PITCH_Y + 0.66, z0: 0, z1: 0.012 }, { x0: VX - 0.03, y0: PITCH_Y + 0.6, x1: VX + 0.03, y1: PITCH_Y + 14, z0: 0, z1: 0.012 }], { color: '#e2e8f0' });
    const bg = FX.once('engstands', 1480, 400, (g, w, h) => CE.fx2BgEngStands(g, w, h));
    K.quad({ x: VX, y: PITCH_Y + 14, z: -0.3, w: 34, h: 7, ang: Math.PI / 2, img: bg, light: [0.85, 0.85, 0.95] });
  }
  // o Fox sentado na beirada do degrau: o rosto na sombra (só o sorriso no overlay)
  function foxSeated(K, light, dz = 0, view) {
    act(K, CE.fx2Fox(), [FOXW[0], FOXW[1], FOXW[2] + dz], { id: 'fox', ang: Math.PI / 2, view, anim: 'sit', seat: 0, k: 0.92, light });
  }

  CE.registerCine3D('fox_watch', {
    phases: [200, 220, 180],
    music: 'dread',
    title: '🦊 ENQUANTO ISSO, NA ARQUIBANCADA...',
    tags: ['PLANO 1 • A ARQUIBANCADA', 'PLANO 2 • O QUE ELE VÊ', 'PLANO 3 • ???'],
    subs: [
      [{ from: 70, text: 'Todo mundo grita. Menos um homem de terno, imóvel.', color: '#fca5a5' }],
      [
        { from: 14, to: 112, who: '???', text: '"Finalmente..."', color: FOX_COLOR },
        { from: 118, who: '???', text: '"Eu vi um MONSTRO."', color: FOX_COLOR }
      ],
      [{ from: 6, text: 'Ninguém viu ele sorrir. Quem é esse homem?', color: '#fca5a5' }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.9);
      if (phase === 0) {
        // TRAVELLING pela torcida pulando... até o único homem sentado, parado no escuro
        const pan = easeIO(seg(t, 0, 140));
        const push = easeIO(seg(t, 120, 200));
        const e0 = [lerp(VX - 5.2, VX - 0.3, pan), VY + 3.5, 1.0];
        const eye = mixP(e0, [FOXW[0] - 0.35, FOXW[1] + 3.0, 1.75], push);
        englishStands(K, t, 1, eye, 1.6);
        pitch(K);
        foxSeated(K, [0.12, 0.13, 0.2]);
        cam(K, shake(K, eye, f * 0.5, 0.004), mixP([e0[0] + 1.4, VY - 1.6, 1.2], [FOXW[0] + 0.1, FOXW[1], FOXW[2] + 0.35], push), lerp(50, 40, push));
      } else if (phase === 1) {
        // O QUE ELE VÊ: por cima do ombro dele (de longe), o jogo lá embaixo; você fura a
        // defesa inglesa — câmera lenta quando passa pelo último
        const A = remap(t, P1_KEYS);
        const eye = [FOXW[0] + 1.05, FOXW[1] - 2.05, FOXW[2] + 1.35];
        englishStands(K, t, 0.6, eye, 1.6);
        pitch(K);
        foxSeated(K, [0.1, 0.11, 0.17], 0, 'back');
        const yp = youRun(A);
        act(K, CE.cineYou(CE.KITS.japan), yp, { id: 'y', face: [yp[0] + 1, yp[1]], anim: 'run', frame: Math.floor(A * 0.6), k: 0.9, light: [1.2, 0.85, 0.8] });
        ball(K, [yp[0] + 0.24, yp[1] + 0.05, 0.05]);
        engChars().forEach((cd, i) => {
          const [x, y] = ENG[i];
          const beaten = yp[0] > x + 0.2;
          act(K, cd, [x + (beaten ? -0.2 : 0), y], { id: 'e' + i, face: beaten ? [x - 1, y] : [yp[0], yp[1]], anim: beaten ? 'stun' : 'run', frame: beaten ? 0 : Math.floor(A * 0.5) + i * 5, k: 0.9 });
        });
        const k = easeIO(t / 220);
        cam(K, shake(K, mixP(eye, [eye[0] + 0.3, eye[1] + 0.25, eye[2] - 0.1], k), f * 0.5, 0.003), [lerp(VX + 0.2, VX + 1.4, k), PITCH_Y + 4.4, 0.2], lerp(46, 38, k));
        st.you = { __w: [yp[0], yp[1], 0.45] };
        st.trail = { __w: [yp[0] - 1.1, yp[1] + 0.05, 0.4] };
        st.A = A;
      } else {
        // ??? : de frente, ele sentado rindo no meio da festa inglesa; a câmera se afasta
        // e sobe — no fim, um ponto parado numa arquibancada inteira de pé
        const laugh = Math.abs(Math.sin(t * 0.32)) * (t > 20 ? 0.012 : 0);
        const k = easeIO(t / 180);
        const eye = mixP([FOXW[0] - 0.1, FOXW[1] + 2.9, FOXW[2] + 0.95], [FOXW[0] - 0.6, FOXW[1] + 4.8, FOXW[2] + 1.6], k);
        englishStands(K, t, 0.9, eye, 1.5);
        pitch(K);
        foxSeated(K, [0.13, 0.14, 0.22], laugh);
        cam(K, eye, [FOXW[0], FOXW[1] - 0.2, FOXW[2] + lerp(0.4, 0.75, k)], lerp(44, 52, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = {};
      Object.keys(K.st || {}).forEach((k) => {
        const v = K.st[k];
        st[k] = v && v.__w ? scr(K, v.__w) : v;
      });
      if (phase === 0) {
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.45, t, 9, 5);
        const f = spot(K, FOXW[0], FOXW[1], FOXW[2], 0.92, FOX_MOUTH);
        if (f) CE.fx2Grin(ctx, f.x, f.y, 7.6 * f.u, seg(t, 150, 178) * 0.85);
        CE.luckKicker(ctx, 40, top + 30, 'SEMIFINAL SUB-20 • JAPÃO x INGLATERRA', seg(t, 4, 40), '#ef4444');
        CE.luckKicker(ctx, 40, top + 64, 'ARQUIBANCADA INGLESA', seg(t, 24, 60), '#e2e8f0');
        CE.cineSfx(S, 2, 'crowd', () => window.SFX?.crowdVoice?.(300, 520, 1.6, 0.1));
      } else if (phase === 1) {
        FX.pxFlashes(ctx, 0, W, top + 10, top + 120, t, 6, 9);
        // você lá embaixo: o rastro vermelho (o monstro que ele viu)
        if (st.you && st.trail && st.A > 60) CE.luckStreak(ctx, st.trail.x, st.trail.y, st.you.x, st.you.y, 2, 12, '239,68,68', 0.7 * seg(st.A, 60, 90));
        if (st.you && st.A > 100) CE.cineGlow(ctx, st.you.x, st.you.y, 40, 'rgba(239,68,68,0.45)', seg(st.A, 100, 130));
        // o quadro de mangá: a sua chuteira na bola, em vermelho (é isso que ele está vendo)
        if (t > 132 && t < 206) {
          cutWeapon(ctx, S, seg(t, 132, 141), seg(t, 132, 206), [[W * 0.56, top + 22], [W - 22, top + 12], [W - 40, top + 250], [W * 0.53, top + 264]], [240, 0], { bg: '#fee2e2', lines: 'rgba(69,10,10,0.75)', accent: '#ef4444', sock: '#1d4ed8', sock2: '#f8fafc', boot: '#ef4444' });
        }
      } else {
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.5, t, 8, 9);
        const laugh = Math.abs(Math.sin(t * 0.32)) * (t > 20 ? 0.012 : 0);
        const f = spot(K, FOXW[0], FOXW[1], FOXW[2] + laugh, 0.92, FOX_MOUTH);
        if (f) {
          CE.cineGlow(ctx, f.x, f.y, f.u * 9, 'rgba(127,29,29,0.35)', 0.6);
          CE.fx2Grin(ctx, f.x, f.y, 7.6 * f.u, 1);
        }
        // a mão dele girando o dedo (quadro de mangá em pixel art)
        if (t > 44 && t < 120) cutTwirl(ctx, S, seg(t, 44, 53), seg(t, 44, 120), [[W * 0.62, top + 30], [W - 30, top + 18], [W - 44, bot - 40], [W * 0.66, bot - 26]], [260, 0]);
        FX.dim(ctx, W, H, seg(t, 152, 178));
      }
    }
  });

  // ==========================================================================
  // 3) FINAL CONTRA A FRANÇA — "4 EGO'S" (o estádio da final)
  // ==========================================================================
  const CENTER = [53, 14.5];
  // posição dos quatro no gramado (a mesma arrumação da câmera girando da versão 2D)
  const egoPos = (c) => [CENTER[0] + c.pos[1] * 0.009, CENTER[1] + c.pos[0] * 0.009];
  let LINEUP = null;
  function lineup(cast) {
    if (LINEUP && LINEUP.n === cast[0].label) return LINEUP;
    const japan = CE.KITS.japan;
    const france = CE.KITS.france;
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
  // a fila dos quatro no plano 3 (Sae, você, Loki, Hugo) e o travelling do plano 4
  const ROW4 = [[2, 51.65], [0, 52.55], [1, 53.45], [3, 54.35]];
  const XS = [51.2, 52.4, 53.6, 54.8];
  const trackX = (t) => lerp(50.6, 55.4, easeIO(seg(t, 0, 300)));
  // o golpe de cada um no quadro de mangá (cores do personagem)
  const WEAPON = [
    { kind: 'radial', bg: '#ccfbf1', lines: 'rgba(4,47,46,0.8)', accent: '#00f5d4', sock: '#1d4ed8', sock2: '#f8fafc', boot: '#22d3ee' },
    { kind: 'speed', bg: '#fef9c3', lines: 'rgba(66,32,6,0.7)', accent: '#facc15', sock: '#0b1d4d', sock2: '#ef4444', boot: '#facc15' },
    { kind: 'curve', bg: '#ffe4e6', lines: 'rgba(76,5,25,0.55)', accent: '#f43f5e', sock: '#1d4ed8', sock2: '#f8fafc', boot: '#f8fafc' },
    { kind: 'radial', bg: '#fce7f3', lines: 'rgba(80,7,36,0.75)', accent: '#ec4899', sock: '#0b1d4d', sock2: '#ef4444', boot: '#f472b6' }
  ];

  CE.registerCine3D('four_egos_intro', {
    phases: [170, 270, 130, 300, 180],
    music: 'epic',
    title: '🎬 FINAL WORLD CUP U-20 • JAPÃO x FRANÇA',
    tags: ['PLANO 1 • A GRANDE FINAL', 'PLANO 2 • A CÂMERA GIRA', "PLANO 3 • 4 EGO'S", 'PLANO 4 • VOCÊ • LOKI • SAE • HUGO', 'PLANO 5 • SÓ UM REINA'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'O estádio inteiro está de pé. Os hinos terminaram.', color: NARR }],
      [{ from: 20, who: 'NARRADOR', text: 'Quatro monstros esperam o apito no centro do mundo...', color: NARR }],
      [{ from: 24, who: 'NARRADOR', text: 'Quatro egos absolutos dividindo o mesmo gramado.', color: NARR }],
      [
        { from: 20, to: 150, text: 'Japão: você e Sae Itoshi. França: Julian Loki e Hugo.' },
        { from: 154, text: 'Cada um acha que o gramado é só dele.' }
      ],
      [{ from: 24, who: 'NARRADOR', text: 'O apito vai soar. Só um ego vai reinar no topo do mundo!', color: NARR }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, f } = S;
      const cast = CE.getFourEgosCast();
      K.expo(1.0);
      if (phase === 0) {
        // A GRUA: do alto da arquibancada até os dois times perfilados no meio-campo
        const L = lineup(cast);
        L.jp.forEach((c, i) => act(K, c, [47.7 + i * 0.47, 14.6], { id: 'jp' + i, ang: Math.PI / 2, frame: 0, k: 0.86 }));
        L.fr.forEach((c, i) => act(K, c, [53.6 + i * 0.47, 14.6], { id: 'fr' + i, ang: Math.PI / 2, frame: 0, k: 0.86 }));
        const k = easeIO(seg(t, 0, 150));
        cam(K, mixP([53.6, 22.6, 5.3], [lerp(52.2, 51.6, seg(t, 120, 170)), 19.4, 0.95], k), mixP([53, 12.4, 0.2], [52.6, 14.6, 0.58], k), lerp(58, 44, k));
      } else if (phase === 1) {
        // A CÂMERA GIRA em volta dos quatro (sempre para o mesmo lado)
        cast.forEach((c, i) => act(K, c.char, egoPos(c), { id: 'ego' + i, ang: i % 2 ? -Math.PI / 2 : Math.PI / 2, frame: 0, k: 0.9 }));
        const a = 0.95 + easeIO(t / 270) * 2.9;
        const R = lerp(5.8, 5.3, Math.sin((t / 270) * Math.PI));
        cam(K, [CENTER[0] + Math.cos(a) * R, CENTER[1] + Math.sin(a) * R, 1.05], [CENTER[0], CENTER[1], 0.5], 42);
      } else if (phase === 2) {
        // 4 EGO'S: os quatro em silhueta contra a luz da cor de cada um; câmera lenta subindo
        K.expo(0.6);
        K.fog('#03050c', 0.06);
        const A = remap(t, [[0, 0], [8, 8], [70, 22], [130, 60]]);
        ROW4.forEach(([ci, x], j) => {
          const c = cast[ci];
          const kk = ease(seg(A, 2 + j * 3, 14 + j * 3));
          glowAt(K, x, 14.3, 0.62, 1.3, c.color, 0.5 * kk);
          act(K, c.char, [x, 14.5, (1 - kk) * -0.2], { id: 'ego' + ci, ang: Math.PI / 2, view: 'front', left: j > 1, frame: 0, k: 0.92, light: [0.07, 0.07, 0.1] });
        });
        const sh = t < 20 ? 0.03 * (1 - t / 20) : 0.002;
        cam(K, shake(K, [53, 17.6 - ease(seg(t, 0, 130)) * 0.35, lerp(0.22, 0.32, seg(t, 0, 130))], f * 2, sh, 4), [53, 14.5, 0.82], 46);
      } else if (phase === 3) {
        // O TRAVELLING: um de cada vez, de perto mas inteiros (o golpe de cada um no quadro)
        const cx = trackX(t);
        cast.forEach((c, i) => {
          glowAt(K, XS[i], 14.2, 0.55, 1.2, c.color, 0.2);
          act(K, c.char, [XS[i], 14.5], { id: 'ego' + i, ang: Math.PI / 2, view: 'front', left: i % 2 === 1, frame: 0, k: 0.92 });
        });
        cam(K, [cx, 17.55, 0.66], [cx + 0.2, 14.5, 0.5], 40);
      } else {
        // SÓ UM REINA: os quatro de costas, olhando o estádio; a grua sobe e abre tudo
        K.expo(0.92);
        [2, 0, 1, 3].forEach((ci, j) => act(K, cast[ci].char, [51.9 + j * 0.75, 15.6], { id: 'ego' + ci, ang: -Math.PI / 2, frame: 0, k: 0.92 }));
        const k = easeIO(seg(t, 10, 180));
        cam(K, mixP([53, 18.4, 0.42], [53, 20.6, 2.6], k), mixP([53, 9.0, 1.15], [53, 10.5, 0.4], k), lerp(50, 58, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const cast = CE.getFourEgosCast();
      if (phase === 0) {
        FX.flares(ctx, K, S, 0.9);
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.4, t, 12, 2);
        CE.luckKicker(ctx, 40, top + 30, 'COPA DO MUNDO SUB-20 • A GRANDE FINAL', seg(t, 6, 44), '#facc15');
        CE.luckKicker(ctx, 40, top + 64, 'JAPÃO x FRANÇA', seg(t, 60, 96), '#e2e8f0');
      } else if (phase === 1) {
        CE.cineSfx(S, 0, 'whoosh', () => window.SFX?.whoosh?.());
        FX.flares(ctx, K, S, 0.6);
        FX.pxDust(ctx, W, top, bot, t, 20, 'rgba(219,234,254,0.35)', 3, 13);
        // o nome de quem está mais perto da câmera (letreiro discreto embaixo)
        const eye = K.c && K.c.eye;
        let best = null;
        cast.forEach((c, i) => {
          const [x, y] = egoPos(c);
          const d = eye ? Math.hypot(eye[0] - x, eye[2] - y) : i;
          if (!best || d < best.d) best = { i, d };
        });
        if (best) {
          if (!this._f3Close || this._f3Close.run !== CE._cineRun || t < this._f3Close.at) this._f3Close = { i: best.i, at: 0, run: CE._cineRun };
          else if (this._f3Close.i !== best.i) this._f3Close = { i: best.i, at: t, run: CE._cineRun };
          const c = cast[this._f3Close.i];
          const ka = seg(t, this._f3Close.at + 4, this._f3Close.at + 22);
          CE.luckKicker(ctx, 40, bot - 76, c.label, ka, c.color);
          CE.luckKicker(ctx, 40, bot - 46, c.role, seg(t, this._f3Close.at + 12, this._f3Close.at + 34), '#64748b');
        }
      } else if (phase === 2) {
        // o golpe: quadro de impacto (1 quadro), clarão, os olhos acesos na cor de cada um
        if (t >= 6 && t < 7.5) FX.impactFrame(ctx, W, H);
        CE.cineFlash(ctx, W, H, 0.8 * (1 - seg(t, 0, 9)));
        CE.cineSfx(S, 6, 'impact', () => window.SFX?.kick?.(1));
        const A = remap(t, [[0, 0], [8, 8], [70, 22], [130, 60]]);
        ROW4.forEach(([ci, x], j) => {
          const c = cast[ci];
          const open = seg(A, 18 + j * 4, 24 + j * 4);
          if (open <= 0) return;
          const kk = ease(seg(A, 2 + j * 3, 14 + j * 3));
          const p = spot(K, x, 14.5, (1 - kk) * -0.2, 0.92, MAPY(10.25) + 0.35);
          if (!p) return;
          CE.cineSpriteEyes(ctx, c.char, p.x, p.y, p.u, { full: true, aura: c.color, expr: 'angry', blink: open < 0.5, eyeU: MAPY(10.25), mirror: j > 1 });
        });
        CE.cineImpactText(ctx, "4 EGO'S", W / 2, top + 110, 140, '#f8fafc', seg(t, 6, 18), W * 0.7);
        const lw = 420 * ease(seg(t, 16, 34));
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(W / 2 - lw / 2, top + 186, lw, 5);
      } else if (phase === 3) {
        // quem está na frente da câmera: o nome embaixo e o golpe dele num quadro de mangá
        const cx = trackX(t) + 0.2;
        cast.forEach((c, i) => {
          const d = Math.abs(cx - XS[i]);
          const pk = ease(clamp((0.75 - d) / 0.3));
          if (pk <= 0) return;
          CE.cineSfx(S, Math.max(0, Math.round(i * 73 - 20)), 'pan' + i, () => window.SFX?.whoosh?.());
          CE.luckKicker(ctx, 40, bot - 76, c.label, pk, c.color);
          CE.luckKicker(ctx, 40, bot - 46, c.role, pk, '#64748b');
          const side = i % 2 ? -1 : 1;
          const x0 = side > 0 ? W * 0.62 : 22;
          const x1 = side > 0 ? W - 22 : W * 0.38;
          const q = clamp((cx - XS[i] + 0.75) / 1.5);
          cutWeapon(ctx, S, pk, q, [[x0 + 30, top + 26], [x1, top + 14], [x1 - 24, top + 250], [x0, top + 262]], [side * 220, 0], WEAPON[i]);
        });
      } else {
        FX.flares(ctx, K, S, 1);
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.5, t, 14, 4);
        CE.cineSfx(S, 150, 'whistle', () => window.SFX?.whistle?.(1));
        FX.dim(ctx, W, H, seg(t, 160, 180) * 0.7);
      }
    }
  });
})();
