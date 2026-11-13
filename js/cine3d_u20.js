// ============================================================================
// O GOL DA SUB-20 (u20_direct_shoot) — refeito como cinema, no estádio 3D.
// A jogada (como o dono do jogo pediu): o Sae sai jogando, dá um chapéu de calcanhar por
// cima do Rin, os dois correm atrás da bola, o Sae arma a rabona e o Rin bloqueia; a bola
// sobe e passa de raspão na cabeça do Aiku (visto de cima); o mundo perde a cor (preto e
// branco azulado), só você se mexe, chega correndo e chuta de primeira — a cor volta no
// impacto; a bola entra no ângulo, a rede estufa, o estádio explode e o Rin olha.
// Cinema: grua, câmera acompanhando de lado/de frente, câmera lenta com rampa, contraluz dos
// refletores (flare), sombras longas no gramado, quadro de impacto (cores invertidas) e a
// cor indo embora/voltando em círculo. Pouco texto na tela.
// Substitui o registro de js/cine3d_partida.js para esse tipo (a final da Copa continua lá).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;
  const TYPE = 'u20_direct_shoot';
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
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };

  // ---------------------------------------------------------------- campo
  // u = de lado (0 = meio do gol), d = distância da linha do gol do Japão (norte), z = altura
  const GX = 53;
  const GY = 6.6;
  const P = (u, d, z = 0) => [GX + u, GY + d, z];
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const act = (K, who, p, o = {}) => K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  // a bola em pixel art (8 giros guardados), no lugar da bola do mapa (de perto parecia um "@")
  const BALLPX = [];
  const ballPx = (i) => {
    if (!BALLPX.length && CE.ART) {
      for (let r = 0; r < 8; r++) {
        const cv = document.createElement('canvas');
        cv.width = 20;
        cv.height = 20;
        const g = cv.getContext('2d', { willReadFrequently: true });
        CE.ART.ball(g, 10, 10, 8.6, { rot: (r / 8) * (TAU / 5) });
        const id = g.getImageData(0, 0, 20, 20);
        for (let j = 3; j < id.data.length; j += 4) id.data[j] = id.data[j] < 110 ? 0 : 255;
        g.putImageData(id, 0, 0);
        BALLPX.push(cv);
      }
    }
    return BALLPX[((i % 8) + 8) % 8];
  };
  const ball = (K, p, o = {}) => {
    const cv = ballPx(Math.floor((p[0] + p[1]) * 9));
    if (!cv) return K.ball(p[0], p[1], p[2] || 0, o);
    const s = 0.2 * (o.k || 0.85);
    const z = p[2] || 0;
    K.sprite(cv, { x: p[0], y: p[1], z: Math.max(0, z - s * 0.15), w: s, h: s, shadow: z < 1.2 ? 0.1 : 0, light: o.light });
  };
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // torres dos refletores (as lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;

  // A bola depois do bloqueio do Rin: sobe, passa raspando no Aiku e cai onde você chuta
  // (tau = quadros desde o bloqueio). Raspa no Aiku em tau ~67; você chuta em tau ~130.
  const AIKU = P(-0.1, 4.9);
  const flight = (tau) => P(lerp(-0.42, -0.1, clamp(tau / 70)), 5.7 - 0.012 * tau, 0.3 + 0.04 * tau - 0.0003 * tau * tau);
  const TAU_FROZEN = 91; // onde ela fica "parada" enquanto o tempo para
  const KICK_AT = P(-0.12, 4.42);

  // ---------------------------------------------------------------- texturas
  const mk = (w, h, fn) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    fn(c.getContext('2d'), w, h);
    return c;
  };
  let SHADOW = null;
  const shadowCv = () =>
    SHADOW ||
    (SHADOW = mk(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.62)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU);
      g.fill();
    }));
  let RING = null;
  const ringCv = () =>
    RING ||
    (RING = mk(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.7, 'rgba(224,242,254,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    }));

  // sombra comprida no gramado (luz de um refletor): base em (x, y), comprimento len na direção ang
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
    // (de cima a ponta da textura fica na base: v 0.5 → 1)
    const V = (p, u, v) => [p[0], p[1], p[2], u, v, 0, 1, 0];
    const v = [].concat(V(q0, 0, 0.5), V(q1, 1, 0.5), V(q2, 1, 1), V(q0, 0, 0.5), V(q2, 1, 1), V(q3, 0, 1));
    K._push(v, { img: shadowCv(), color: '#000000', alpha: a });
  }
  const shadowFrom = (K, tower, p, z, len, w, a) => {
    const ang = Math.atan2(p[1] - tower[1], p[0] - tower[0]);
    // mais alto no ar, a sombra se afasta da base e fica mais fraca
    longShadow(K, p[0] + Math.cos(ang) * z * 0.9, p[1] + Math.sin(ang) * z * 0.9, len, ang, w, a * (1 - Math.min(0.6, z * 0.35)));
  };

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom azulado; inside: só dentro do círculo / fora: só fora dele
  function bwBlue(ctx, W, H, a = 1, circle = null) {
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
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // quadro de impacto (como no anime): a imagem em preto e branco com as cores invertidas
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
  function flares(ctx, K, S, k = 1) {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.55)', k);
      CE.cineGlow(ctx, p.x, p.y, 40, 'rgba(255,255,255,0.95)', k);
      const gr = ctx.createLinearGradient(p.x - 420, 0, p.x + 420, 0);
      gr.addColorStop(0, 'rgba(125,211,252,0)');
      gr.addColorStop(0.5, `rgba(186,230,253,${0.5 * k})`);
      gr.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 420, p.y - 2, 840, 4);
      // reflexos na linha até o centro da imagem
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.22)'], [0.8, 14, 'rgba(250,204,21,0.2)'], [1.3, 40, 'rgba(99,102,241,0.14)']].forEach(([f, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * f * 2, p.y + (cy - p.y) * f * 2, r, col, k);
      });
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- planos
  const PH = [170, 150, 170, 140, 150, 170, 130, 160, 140, 120, 140, 170, 140];
  const DARK = [0.22, 0.24, 0.32];

  function scene(K, S) {
    const { t, phase, f } = S;
    const c = CE.luckCfg(TYPE);
    const st = (K.st = {});
    const W = (p) => ({ __w: p });
    K.expo(1.0);
    if (phase === 0) {
      // A GRUA: das arquibancadas até o lance — o Sae com a bola, o Rin vindo, você livre
      const k = easeIO(seg(t, 0, 170));
      const sd = lerp(0.7, 1.75, t / 170);
      act(K, c.gk, P(0, 0.42), { id: 'gk', face: P(0, 9), frame: 0 });
      act(K, c.rival, P(-0.45, sd), { id: 'rv', face: P(-0.45, 12), anim: 'run' });
      ball(K, P(-0.45 + Math.sin(t * 0.4) * 0.04, sd + 0.32, 0.05));
      act(K, c.rin, P(-0.2, lerp(7.6, 5.6, ease(t / 170))), { id: 'rin', face: P(-0.45, sd), anim: 'run' });
      act(K, c.defender, P(lerp(0.9, 0.4, k), lerp(4.0, 4.5, k)), { id: 'df', face: P(-0.45, sd), anim: 'run' });
      act(K, c.foes[0], P(-2.2, lerp(2.6, 3.2, k)), { id: 'f0', face: P(-0.4, 12), anim: 'run' });
      act(K, c.foes[1], P(2.6, lerp(2.2, 2.9, k)), { id: 'f1', face: P(-0.4, 12), anim: 'run' });
      // (o Bachira corre mais à frente, no meio do ataque: lá atrás a grua passava por cima
      // dele e ele saía cortado embaixo; agora fica inteiro no quadro o plano todo)
      act(K, c.mates[0], P(2.2, lerp(6.4, 5.4, k)), { id: 'm0', face: P(2, 0), anim: 'run' });
      act(K, c.mates[1], P(1.0, lerp(10.2, 9.3, k)), { id: 'm1', face: P(1, 0), anim: 'run' });
      act(K, c.you, P(-2.4, lerp(10.4, 9.2, k)), { id: 'y', face: P(-2, 0), anim: 'run' });
      cam(K, mixP(P(3.9, 15.8, 6.3), P(1.75, 8.7, 1.3), k), mixP(P(0.2, 6.2, 0.3), P(-0.55, 2.6, 0.42), k), lerp(62, 46, k));
    } else if (phase === 1) {
      // O SAE: câmera na altura da bola, de lado, acompanhando; o Rin entra pela direita
      const sd = lerp(1.75, 3.05, ease(t / 150));
      const rd = lerp(5.7, 3.95, easeIO(t / 150));
      act(K, c.rival, P(-0.45, sd), { id: 'rv', face: P(-0.45, 12), anim: 'run' });
      ball(K, P(-0.45 + Math.sin(t * 0.4) * 0.04, sd + 0.32, 0.05));
      act(K, c.rin, P(-0.25, rd), { id: 'rin', face: P(-0.45, sd), anim: 'run' });
      // (o Aiku fora do quadro: com a câmera mais longe ele entrava gigante na borda)
      act(K, c.defender, P(1.3, lerp(5.5, 5.7, t / 150)), { id: 'df', face: P(-0.45, sd), anim: 'idle' });
      // de lado, na altura da bola, a ~3,6 ladrilhos (antes 2,3: o Sae e o Rin passavam de
      // 45% da imagem e o Aiku saía gigante e cortado)
      cam(K, shake(K, P(3.2, sd + 0.35, 0.3), f, 0.01), P(-0.45, sd + 0.2, 0.44), 44);
    } else if (phase === 2) {
      // O CHAPÉU: de baixo, contra os refletores — câmera lenta no toque e na bola por cima do Rin
      const A = remap(t, [[0, 0], [40, 40], [140, 64], [170, 100]]);
      const FL = 44;
      const LAND = 86;
      const sd = A < FL ? lerp(3.05, 3.22, A / FL) : 3.22 + seg(A, FL + 8, 100) * 1.0;
      const su = A < FL + 8 ? -0.45 : lerp(-0.45, -0.85, ease(seg(A, FL + 8, FL + 30)));
      const flick = A >= FL - 4 && A < FL + 14;
      act(K, c.rival, P(su, sd), { id: 'rv', face: P(su, 12), anim: flick ? 'rabona' : 'run', opts: flick ? { animTime: (A - FL + 4) * 1.5 } : undefined, light: [0.6, 0.62, 0.75] });
      const turned = A > 72;
      act(K, c.rin, P(-0.25, 3.95 + seg(A, 80, 100) * 0.3), { id: 'rin', face: turned ? P(-0.25, 12) : P(-0.45, sd), anim: turned ? 'run' : 'idle', light: [0.55, 0.58, 0.72] });
      let bp;
      if (A < FL) bp = P(-0.45, sd + 0.3, 0.05);
      else if (A < LAND) {
        const q = seg(A, FL, LAND);
        bp = P(lerp(-0.45, -0.35, q), lerp(3.52, 4.95, q), 0.08 + Math.sin(q * Math.PI) * 1.4);
      } else bp = P(-0.35, 4.95 + seg(A, LAND, 100) * 0.2, 0.06);
      ball(K, bp, { k: 0.85 });
      const up = Math.sin(seg(A, FL, LAND) * Math.PI);
      // (de lado e de baixo, a ~3 ladrilhos: os dois inteiros mesmo quando a câmera sobe
      // atrás da bola; o refletor ao fundo)
      cam(K, shake(K, P(2.75, 4.45, 0.22), f, 0.004), P(-0.42, 3.62, 0.62 + up * 0.42), 50);
      st.ball = W(bp);
      st.slow = t > 40 && t < 140 ? 1 : 0;
    } else if (phase === 3) {
      // A CORRIDA: de frente, a câmera recuando; a bola rola entre a câmera e os dois
      const k = t / 140;
      const sp = P(-0.78, lerp(4.2, 5.15, k));
      const rp = P(-0.02, lerp(3.95, 5.1, k));
      act(K, c.rival, sp, { id: 'rv', face: P(-0.78, 12), anim: 'run' });
      act(K, c.rin, rp, { id: 'rin', face: P(-0.02, 12), anim: 'run', opts: { expr: 'angry' } });
      ball(K, P(-0.4, lerp(5.35, 5.62, ease(k)), 0.05));
      // (mais longe e um pouco mais alta: a bola rolando aparece inteira na frente deles; a
      // ~3,2 ladrilhos o Sae não passa de 45% da imagem)
      cam(K, shake(K, P(-0.4 + Math.sin(t * 0.03) * 0.08, lerp(7.9, 8.4, k), 0.62), f, 0.012), P(-0.4, lerp(4.5, 5.25, k), 0.5), 46);
      st.rin = W([rp[0], rp[1], 0.95]);
      st.rv = W([sp[0], sp[1], 0.95]);
    } else if (phase === 4) {
      // A RABONA: de lado, rente ao chão; câmera lenta no bloqueio do Rin; a bola sobe
      const A = remap(t, [[0, 0], [50, 50], [110, 62], [150, 102]]);
      const CL = 56;
      const tau = Math.max(0, A - CL);
      const sAnim = A < 30 ? 'run' : 'rabona';
      act(K, c.rival, P(-0.45, lerp(5.15, 5.45, ease(seg(A, 0, 50))) - (A > CL ? Math.min(0.3, tau * 0.01) : 0)), { id: 'rv', face: P(-0.45, 12), anim: sAnim, opts: sAnim === 'rabona' ? { animTime: Math.min(70, (A - 30) * 1.3) } : undefined });
      const rk = ease(seg(A, 0, 52));
      act(K, c.rin, A < CL ? P(lerp(0.35, -0.38, rk), lerp(5.1, 5.95, rk)) : P(-0.38, 5.95 + Math.min(0.3, tau * 0.01)), { id: 'rin', face: A < 40 ? P(-0.38, 6.6) : P(-0.4, 0), anim: A < 50 ? 'run' : 'windup', frame: A < 50 ? undefined : 1 });
      const bp = A < CL ? P(-0.42, 5.64, 0.05) : flight(tau);
      ball(K, bp, { k: 0.85 });
      // a onda no chão e a grama voando no impacto
      if (A >= CL) {
        const q = seg(tau, 0, 30);
        const r = 0.15 + ease(q) * 1.3;
        const cp = P(-0.4, 5.7);
        K.floor({ x0: cp[0] - r, y0: cp[1] - r, x1: cp[0] + r, y1: cp[1] + r, z: 0.012, img: ringCv(), color: '#e0f2fe', alpha: 1 - q, em: true });
        for (let i = 0; i < 18; i++) {
          const a = rnd(i, 3) * TAU;
          const d = Math.min(1.2, tau * (0.012 + rnd(i, 4) * 0.02));
          const z = Math.max(0, tau * (0.02 + rnd(i, 5) * 0.02) - tau * tau * 0.0006);
          const x = cp[0] + Math.cos(a) * d;
          const y = cp[1] + Math.sin(a) * d;
          K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.04, color: '#4ade80', alpha: 1 - seg(tau, 30, 46) });
        }
      }
      const tilt = easeIO(seg(A, CL + 4, 100));
      // (de lado, rente ao chão, a ~3,2–3,6 ladrilhos; a câmera sobe atrás da bola só até os
      // dois continuarem inteiros — antes, a 2 ladrilhos, eles passavam de 60% e saíam
      // cortados embaixo)
      cam(K, shake(K, P(lerp(3.4, 3.0, seg(A, 0, CL)), 5.75, 0.15), f * 2, A >= CL ? 0.035 * Math.max(0, 1 - tau / 30) : 0.004, 6), P(-0.4, 5.7, lerp(0.42, 1.0, tilt)), 46);
      st.clash = W(P(-0.4, 5.7, 0.45));
      st.ball = W(bp);
      st.clashT = t;
      st.CL = A >= CL;
    } else if (phase === 5) {
      // O RASPÃO: do alto, por trás do Aiku — ele pula, a bola vem do lado do Rin e passa
      // raspando na cabeça dele; o tempo desacelera no raspão. Só o Aiku e a bola no quadro.
      const tau = t < 30 ? 38 + t * 0.9 : t < 60 ? 65 + (t - 30) * 0.12 : 68.6 + (t - 60) * 0.5;
      const bp = flight(tau);
      ball(K, bp, { k: 1.25 });
      const jq = seg(tau, 46, 86);
      const jz = Math.sin(jq * Math.PI) * 0.86; // (alto: a bola passa rente à cabeça)
      const inAir = jq > 0 && jq < 1;
      act(K, c.defender, AIKU, { id: 'df', z: jz, face: P(-0.3, 6.2), anim: inAir ? 'jump' : 'idle', opts: inAir ? { animTime: jq * 40 } : undefined });
      // a câmera do alto, atrás e ao lado do Aiku (a bola cruza o quadro na frente dele)
      const k = easeIO(seg(t, 0, 170));
      // (10% mais longe do Aiku e, quando ele volta ao chão, a câmera baixa a mira: ele fica
      // inteiro — antes os pés saíam cortados embaixo)
      const ce = mixP(P(-0.1, 4.9, 0.5), P(lerp(1.15, 0.95, k), lerp(3.55, 3.75, k), lerp(2.6, 2.4, k)), 1.1);
      cam(K, shake(K, ce, f * 0.5, t > 28 && t < 40 ? 0.01 : 0.002), P(-0.12, 5.0, 1.15 - 0.45 * easeIO(seg(t, 80, 150))), 50);
      st.graze = W(P(-0.1, 4.9, 1.6));
      st.ball = W(bp);
      st.b1 = W(flight(tau - 4));
      st.b2 = W(flight(tau - 9));
    } else if (phase === 6) {
      // O EGO: você parado lá atrás, no mundo sem cor (sem olhos acesos nem brilho em volta:
      // proibidos pelo dono, K1 — o despertar é a cor que volta no chute).
      // Plano médio de frente e de lado (a câmera chega devagar), você inteiro e o refletor ao
      // fundo; os três parados ficam fora do quadro (antes a câmera ficava colada neles e o
      // rosto do Rin enchia a tela em blocos)
      const yp = P(-1.6, 8.4);
      act(K, c.you, yp, { id: 'y', face: P(-0.1, 4.6), frame: 0, light: DARK });
      [[c.rin, 'rin', P(-0.38, 6.25)], [c.rival, 'rv', P(-0.62, 5.7)]].forEach(([ch, id, p]) => act(K, ch, p, { id, face: P(-0.1, 4.9), frame: 0, light: DARK }));
      act(K, c.defender, AIKU, { id: 'df', z: 0.12, face: P(-0.3, 6.2), anim: 'jump', opts: { animTime: 36 }, light: DARK });
      ball(K, flight(TAU_FROZEN), { k: 0.9 });
      const k = easeIO(t / 130);
      // (a câmera a ~40° de onde você olha, chegando de 4,6 a 4,0 ladrilhos; ela mira 15° para
      // o lado contrário dos três, que ficam fora do quadro, e você fica num terço)
      const d6 = lerp(4.6, 4.0, k);
      const ce = P(-1.6 + Math.cos(-0.45) * d6, 8.4 + Math.sin(-0.45) * d6, lerp(0.5, 0.46, k));
      const dir = Math.atan2(yp[1] - ce[1], yp[0] - ce[0]) - 0.26;
      cam(K, ce, [ce[0] + Math.cos(dir) * 4, ce[1] + Math.sin(dir) * 4, 0.66], 38);
    } else if (phase === 7) {
      // SÓ VOCÊ: tudo parado e sem cor; você corre entre eles até a bola parada no ar.
      // A câmera vem atrás e acima, a ~4 ladrilhos (antes: colada no seu ombro, você gigante
      // e cortado na frente dos outros)
      const k = easeIO(t / 160);
      const yp = P(lerp(-1.6, -0.3, k), lerp(8.4, 5.05, k));
      act(K, c.you, yp, { id: 'y', face: P(-0.1, 4.4), anim: 'run' });
      act(K, c.rin, P(-0.38, 6.25), { id: 'rin', face: P(-0.1, 4.9), anim: 'windup', frame: 1 });
      act(K, c.rival, P(-0.62, 5.7), { id: 'rv', face: P(-0.45, 12), anim: 'rabona', opts: { animTime: 60 } });
      act(K, c.defender, AIKU, { id: 'df', z: 0.12, face: P(-0.3, 6.2), anim: 'jump', opts: { animTime: 36 } });
      act(K, c.foes[0], P(-2.2, 3.4), { id: 'f0', face: P(-0.4, 6), frame: 0 });
      act(K, c.gk, P(0, 0.42), { id: 'gk', face: P(0, 9), frame: 0 });
      const bp = flight(TAU_FROZEN);
      ball(K, bp, { k: 0.9 });
      // grama parada no ar perto do Rin
      for (let i = 0; i < 12; i++) {
        const x = GX - 0.4 + (rnd(i, 7) - 0.5) * 1.4;
        const y = GY + 5.75 + (rnd(i, 8) - 0.5) * 0.8;
        const z = 0.15 + rnd(i, 9) * 0.6;
        K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.04, color: '#86efac' });
      }
      // (atrás = contra a corrida, ao lado = do lado de fora do campo)
      const ru = yp[0] - GX;
      const rd = yp[1] - GY;
      cam(K, shake(K, P(ru - 0.362 * 3.2 + 0.933 * 2.4, rd + 0.933 * 3.2 + 0.362 * 2.4, 1.25), f * 0.5, 0.006), P(ru + 0.362 * 1.8, rd - 0.933 * 1.8, 0.6), 50);
      st.you = W([yp[0], yp[1], 0.45]);
      st.ball = W(bp);
      st.ballTop = W([bp[0], bp[1], 4.2]);
    } else if (phase === 8) {
      // DE PRIMEIRA: de perfil, rente ao chão; a bola desce e você chuta sem deixar quicar
      const KT = 90;
      const tau = TAU_FROZEN + seg(t, 0, KT) * (130 - TAU_FROZEN);
      const yp = t < 78 ? P(lerp(-0.3, KICK_AT[0] - GX, ease(t / 78)), lerp(5.05, KICK_AT[1] - GY + 0.02, ease(t / 78))) : KICK_AT;
      const an = t < 70 ? 'run' : t < KT ? 'windup' : 'shoot';
      // (sem aura no chute: proibida pelo dono)
      act(K, c.you, yp, { id: 'y', face: P(0.4, 0), anim: an, frame: an === 'run' ? undefined : 1 });
      let bp;
      if (t < KT) bp = flight(tau);
      else {
        const q = (t - KT) / 50;
        bp = P(lerp(-0.1, 0.62, clamp(q)), 4.14 - (t - KT) * 0.12, 0.43 + (t - KT) * 0.008);
      }
      ball(K, bp, { k: 0.85 });
      // (o Aiku fora do quadro: com a câmera mais longe ele ficava gigante na frente dela)
      act(K, c.defender, P(2.6, 1.2), { id: 'df', face: P(-0.1, 4.4), frame: 0 });
      const push = easeIO(seg(t, 0, KT));
      // de perfil, rente ao chão, a ~3,7 ladrilhos: você inteiro no quadro (antes, a 1,6, o
      // boneco passava da altura da imagem e saía cortado embaixo depois do chute)
      cam(K, shake(K, P(lerp(3.9, 3.55, push), 4.6, 0.3), f * 2, t >= KT ? 0.03 * Math.max(0, 1 - (t - KT) / 26) : 0.003, 3), P(-0.15, 4.35, 0.48), lerp(42, 40, push));
      st.foot = W(P(-0.1, 4.2, 0.35));
      st.ball = W(bp);
    } else if (phase === 9) {
      // RUMO AO GOL: atrás da bola; o Fukaku voa e não alcança. A câmera corre atrás da bola
      // e freia na entrada da área: a bola segue sozinha até o ângulo e o gol fica inteiro e
      // nítido ao fundo (antes ela ia até a rede, que tapava 2/3 da tela, borrada)
      const q = seg(t, 0, 84);
      const bp = P(lerp(0.0, 0.82, q), lerp(3.2, 0.1, q), lerp(0.5, 0.82, q));
      ball(K, bp, { k: 0.85 });
      const dq = seg(t, 20, 72);
      act(K, c.gk, P(lerp(-0.4, 0.6, ease(dq)), 0.55), { id: 'gk', z: Math.sin(dq * Math.PI) * 0.32, face: P(0, 9), anim: dq > 0 ? 'dive' : 'idle', opts: dq > 0 ? { animTime: dq * 30 } : undefined });
      const qc = 0.38 * ease(seg(t, 0, 64));
      const bc = P(lerp(0.0, 0.82, qc), lerp(3.2, 0.1, qc), lerp(0.5, 0.82, qc));
      const kl = ease(seg(t, 20, 84));
      cam(K, shake(K, [bc[0] - 0.25, bc[1] + 1.05, bc[2] + 0.12], f * 2, 0.01), mixP([bc[0] + 0.12, bc[1] - 1.2, bc[2] - 0.05], [bp[0] - 0.2, bp[1], bp[2] - 0.2], kl), 56);
      st.ball = W(bp);
    } else if (phase === 10) {
      // A REDE: de lado, da frente da área — a bola entra no ângulo, o Fukaku no chão e o gol
      // inteiro e nítido (antes a câmera ficava dentro do gol, com o goleiro gigante na frente
      // dela e uma rede desenhada por cima da tela inteira)
      const HIT = 26;
      const bp = t < HIT ? P(lerp(0.75, 0.62, t / HIT), lerp(2.4, -0.3, t / HIT), lerp(0.8, 0.62, t / HIT)) : P(0.62, -0.32, Math.max(0.1, 0.62 - (t - HIT) * 0.012));
      ball(K, bp, { k: 0.9 });
      act(K, c.gk, P(-0.75, 0.9), { id: 'gk', face: P(-2, 0.9), anim: 'dive', opts: { animTime: 40 } });
      const cel = t > 60;
      act(K, c.you, P(lerp(-0.12, -0.9, seg(t, 60, 140)), lerp(4.42, 3.6, seg(t, 60, 140))), { id: 'y', face: cel ? P(-3, 2) : P(0.4, 0), anim: cel ? 'run' : 'shoot', frame: cel ? undefined : 1 });
      act(K, c.rin, P(-0.6, 6.0), { id: 'rin', face: P(0.4, 0), frame: 0 });
      cam(K, shake(K, P(lerp(2.5, 2.35, seg(t, 0, 140)), lerp(3.0, 2.85, seg(t, 0, 140)), 0.5), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(-0.1, 0.25, 0.45), 48);
      st.ball = W(bp);
      st.hit = t >= HIT;
    } else if (phase === 11) {
      // O ESTÁDIO: você de braços abertos contra os refletores; a grua sobe e mostra tudo
      const k = easeIO(seg(t, 30, 170));
      const yp = P(-1.4, 3.3);
      act(K, c.you, yp, { id: 'y', face: P(-1.4, 0), anim: 'celebrate', light: [lerp(0.35, 1, k), lerp(0.38, 1, k), lerp(0.48, 1.05, k)] });
      [[c.mates[0], 'm0', P(-0.2, lerp(6.4, 4.2, ease(seg(t, 10, 120))))], [c.mates[1], 'm1', P(-2.6, lerp(6.8, 4.4, ease(seg(t, 20, 130))))], [c.rin, 'rin', P(-0.5, 6.6)]].forEach(([ch, id, p], i) => act(K, ch, p, { id, face: yp, anim: i < 2 ? 'run' : 'idle', frame: i < 2 ? undefined : 0 }));
      // (a grua sobe por cima da área, sem sair do campo: atrás do gol já é arquibancada. Começa
      // a ~3 ladrilhos de você e mira mais perto no fim: você inteiro do começo ao fim — antes
      // passava de 60% no começo e saía cortado embaixo no fim)
      cam(K, mixP(P(-1.5, 0.2, 0.4), P(-0.6, 0.9, 2.9), k), mixP(P(-1.4, 3.3, 0.68), P(-1.2, 6.0, 0.4), k), lerp(50, 60, k));
      st.you = W(P(-1.4, 3.3, 0.55));
    } else {
      // O OLHAR DO RIN: ele parado no meio da festa, olhando você comemorar lá na frente
      const k = easeIO(t / 140);
      act(K, c.rin, P(-0.5, 6.4), { id: 'rin', face: P(-1.4, 3.3), frame: 0, light: [0.62, 0.66, 0.78], opts: { expr: 'angry' } });
      act(K, c.you, P(-1.4, 3.3), { id: 'y', face: P(-1.4, 0), anim: 'celebrate' });
      act(K, c.mates[0], P(-0.9, 3.7), { id: 'm0', face: P(-1.4, 3.3), anim: 'celebrate' });
      act(K, c.mates[1], P(-2.0, 3.6), { id: 'm1', face: P(-1.4, 3.3), anim: 'celebrate' });
      // (o Sae fica fora do quadro, atrás da câmera: na frente dela ele saía gigante e cortado)
      act(K, c.rival, P(1.6, 9.0), { id: 'rv', face: P(-0.5, 6.4), frame: 0 });
      // o Rin de perfil, inteiro, a ~3,5 ladrilhos, e você comemorando lá atrás; a câmera
      // gira um pouco em volta dele (antes ficava nas costas dele)
      const a12 = lerp(0.1, 0.2, k);
      const d12 = lerp(3.8, 3.65, k);
      cam(K, P(-0.5 + Math.cos(a12) * d12, 6.4 + Math.sin(a12) * d12, 0.7), P(-0.95, 4.85, 0.55), 42);
    }
  }

  // ---------------------------------------------------------------- quadros de mangá (cut-ins)
  // Os closes são ilustração em alta resolução (js/cine_art.js), nunca o boneco ampliado.
  const CAa = () => CE.ART;
  // o chapéu: o calcanhar do Sae levantando a bola, linhas subindo (em pixel art)
  const PIX = 6; // tamanho do pixel dos quadros de mangá (a escala dos bonecos)
  function cutHeel(ctx, S, c, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const sh = bot - top;
    const cd = c.rival || {};
    CA.panel(
      ctx,
      [[W * 0.56, bot - sh * 0.5], [W - 16, bot - sh * 0.57], [W - 16, bot - 16], [W * 0.5, bot - 16]],
      (b, g) => {
        g.fillStyle = '#e2e8f0';
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.speedLines(g, -Math.PI / 2 + 0.25, W, S.H, { color: 'rgba(15,23,42,0.6)', n: 30, t: q * 60, speed: 30, thick: 8 });
        const e = ease(q * 1.6);
        CA.boot(g, b.x + b.w * 0.36 + b.ox, b.y + b.h * 0.8, b.h * 0.16, { sock: cd.jerseyPrimary || '#f8fafc', sock2: cd.jerseySecondary || '#dc2626', boot: '#facc15', ang: lerp(0.35, -0.75, e), flip: true });
        CA.ball(g, b.x + b.w * 0.6 + b.ox, b.y + b.h * (0.74 - 0.5 * ease(q)), b.h * 0.13, { rot: q * 7 });
      },
      { k: kIn, from: [W * 0.5, 0], pixel: PIX }
    );
  }
  // antes do chute: quadro grande, sua chuteira indo na bola; sem cor (o tempo parou), só o
  // seu ciano; no último instante a estrela de impacto atrás da bola (em pixel art)
  function cutKick(ctx, S, c, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]],
      (b, g) => {
        g.fillStyle = '#dbe4ef';
        g.fillRect(b.x, b.y, b.w, b.h);
        const bx = b.x + b.w * 0.63;
        const by = b.y + b.h * (0.4 + 0.06 * q);
        CA.speedRadial(g, bx, by, W, S.H, { color: 'rgba(15,23,42,0.8)', inner: b.h * 0.22, n: 60, thick: 1.8 });
        if (q > 0.82) CA.burst(g, bx, by, b.h * 0.3 * ease((q - 0.82) / 0.18), { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
        g.fillStyle = 'rgba(0,245,212,0.35)';
        g.beginPath();
        g.arc(bx, by, b.h * 0.24, 0, Math.PI * 2);
        g.fill();
        CA.ball(g, bx, by, b.h * 0.17, { rot: q * 3 });
        const e = easeIO(q);
        CA.boot(g, b.x + b.w * lerp(0.16, 0.47, e), b.y + b.h * lerp(0.95, 0.66, e), b.h * 0.15, { sock: '#64748b', sock2: '#e2e8f0', boot: '#22d3ee', ang: lerp(1.0, -0.15, e) });
      },
      { k: kIn, from: [0, 50], pixel: PIX }
    );
  }

  function overlay(ctx, S, K) {
    const { W, H, t, phase, top, bot } = S;
    const c = CE.luckCfg(TYPE);
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[2], v.__w[1]) : v;
    });
    const score = (h, a, k = 1, fl = 0) => CE.luckScore(ctx, c, W - 440, top + 18, h, a, c.minute, 0.85 * k, fl);
    if (phase === 0) {
      flares(ctx, K, S, 0.9);
      CE.luckKicker(ctx, 40, top + 30, c.place, seg(t, 10, 40), '#e2e8f0');
      CE.luckKicker(ctx, 40, top + 66, `${c.minute} • ACRÉSCIMOS • ${c.before[0]} x ${c.before[1]}`, seg(t, 30, 60), '#facc15');
      score(c.before[0], c.before[1]);
      // (sem o marcador "▼ NOME • LIVRE" em cima de você: letreiro sobre o corpo é proibido)
    } else if (phase === 1) {
      const g = CE.luckGrassCv && CE.luckGrassCv();
      if (g) ctx.drawImage(g, -160, bot - 90, W + 320, 120);
      CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.06);
      score(c.before[0], c.before[1]);
    } else if (phase === 2) {
      flares(ctx, K, S, 1);
      // a bola com brilho contra os refletores na câmera lenta
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 60, 'rgba(255,255,255,0.5)', 0.8);
      if (st.slow) {
        ctx.save();
        ctx.globalAlpha = 0.25 * seg(t, 40, 60) * (1 - seg(t, 120, 140));
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, top, W, bot - top);
        ctx.restore();
      }
      // quadro de mangá: o calcanhar do Sae levantando a bola (close em ilustração, não o boneco)
      if (t > 52 && t < 100) cutHeel(ctx, S, c, seg(t, 52, 62), seg(t, 56, 100));
    } else if (phase === 3) {
      CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.12);
      score(c.before[0], c.before[1]);
    } else if (phase === 4) {
      // o impacto: quadro invertido por 3 quadros, depois o clarão e os raios
      const A = remap(t, [[0, 0], [50, 50], [110, 62], [150, 102]]);
      const tau = A - 56;
      if (tau >= 0 && tau < 1.0) impactFrame(ctx, W, H);
      if (tau >= 0) {
        const cp = st.clash || { x: W / 2, y: H * 0.6 };
        CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(tau, 0.5, 4)));
        if (tau < 6) CE.drawRadialSpeedLines(ctx, cp.x, cp.y, W, '#e0f2fe', 0.5 * (1 - tau / 6));
        CE.cineGlow(ctx, cp.x, cp.y, 140, 'rgba(165,243,252,0.6)', 1 - seg(tau, 0, 14));
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(255,255,255,0.6)', 0.9);
      }
      CE.cineSfx(S, 80, 'bloqueio', () => window.SFX?.tackle?.());
      score(c.before[0], c.before[1]);
    } else if (phase === 5) {
      // o raspão: rastro da bola, um clarão no contato e a cor indo embora em círculo dali
      const g = st.graze;
      if (st.ball && st.b1 && st.b2) CE.luckStreak(ctx, st.b2.x, st.b2.y, st.ball.x, st.ball.y, 2, 16, '241,245,249', 0.55);
      if (g && t > 26 && t < 50) {
        const q = seg(t, 26, 50);
        CE.cineGlow(ctx, g.x, g.y, 90, 'rgba(255,255,255,0.85)', 1 - q);
        if (t < 36) CE.drawRadialSpeedLines(ctx, g.x, g.y, W, '#f8fafc', 0.35 * (1 - q));
      }
      if (g && t >= 34) bwBlue(ctx, W, H, 1, { inside: true, x: g.x, y: g.y, r: ease(seg(t, 34, 100)) * W * 1.3 });
      CE.cineSfx(S, 30, 'raspao', () => window.SFX?.whoosh?.());
    } else if (phase === 6) {
      bwBlue(ctx, W, H, 1);
      // (sem os olhos acesos e sem o brilho em volta de você: proibidos pelo dono, K1)
    } else if (phase === 7) {
      bwBlue(ctx, W, H, 1);
      // a bola parada no ar num feixe de luz
      if (st.ball && st.ballTop) CE.cineShafts(ctx, st.ball.x, Math.max(top - 40, st.ballTop.y), Math.PI / 2, Math.max(80, st.ball.y - st.ballTop.y + 30), 0.3, 4, '241,245,249', 0.16, t);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(255,255,255,0.5)', 0.9);
      // (sem o brilho ciano em volta de você, que virava aura, e sem o letreiro "O TEMPO
      // PAROU": a imagem sem cor já conta)
    } else if (phase === 8) {
      const KT = 90;
      const fp = st.foot || { x: W * 0.45, y: H * 0.7 };
      // até o chute sem cor; no impacto: quadro invertido e a cor voltando em círculo do pé
      if (t < KT) bwBlue(ctx, W, H, 1);
      else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, KT, KT + 16)) * W * 1.4 });
      if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
      if (t >= KT) {
        CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
        if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
        if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '0,245,212', 0.85 * (1 - seg(t, KT + 30, KT + 50)));
        CE.cineImpactText(ctx, 'DOM!!', W * 0.74, top + 120, 110, '#f8fafc', seg(t, KT, KT + 6), W * 0.4, -0.1);
      } else if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.45)', 0.9);
      // antecipação: quadro grande com a sua chuteira indo na bola (sem cor, só o seu ciano)
      if (t > 58 && t < KT) cutKick(ctx, S, c, seg(t, 58, 66), seg(t, 58, KT));
      CE.cineSfx(S, KT, 'chute', () => window.SFX?.kick?.(1));
    } else if (phase === 9) {
      CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.28);
      CE.drawSpeedLines(ctx, W, H, '#00f5d4', 0.12);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 120, 'rgba(0,245,212,0.45)');
      CE.cineSfx(S, 30, 'vento', () => window.SFX?.whoosh?.());
    } else if (phase === 10) {
      const HIT = 26;
      // (a rede é a do gol 3D, nítida; a rede desenhada por cima da tela era a vista de dentro)
      if (st.hit) {
        CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, HIT, HIT + 10)));
        CE.cineBokeh(ctx, W, top, top + (bot - top) * 0.5, t, 30, ['rgba(255,255,255,0.6)', 'rgba(250,204,21,0.5)'], 4);
        CE.cineImpactText(ctx, 'GOOOOOL!!', W / 2, top + (bot - top) * 0.44, 150, '#f8fafc', seg(t, HIT + 4, HIT + 12), W * 0.9, -0.06);
      }
      score(st.hit ? c.after[0] : c.before[0], c.after[1], 1, st.hit ? 1 - seg(t, HIT, HIT + 30) : 0);
      CE.cineSfx(S, HIT, 'rede', () => window.SFX?.goal?.());
    } else if (phase === 11) {
      flares(ctx, K, S, 1);
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 170, 'rgba(255,255,255,0.22)', 1 - seg(t, 30, 120) * 0.7);
      // confete
      ctx.save();
      for (let i = 0; i < 70; i++) {
        const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
        const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
        ctx.fillStyle = ['#00f5d4', '#facc15', '#f8fafc', '#38bdf8', '#ef4444'][i % 5];
        ctx.fillRect(x, y, 5, 8);
      }
      ctx.restore();
      // (sem o letreiro grande "O GOL DA VITÓRIA": a festa e o placar já contam)
      score(c.after[0], c.after[1]);
    } else {
      ctx.fillStyle = `rgba(0,0,0,${seg(t, 110, 140)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const def = {
    phases: PH,
    music: 'u20',
    theme: 'u20_national',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    get title() {
      return CE.luckCfg(TYPE).title;
    },
    tags: ['PLANO 1 • ACRÉSCIMOS', 'PLANO 2 • O SAE', 'PLANO 3 • O CHAPÉU', 'PLANO 4 • A CORRIDA', 'PLANO 5 • A RABONA', 'PLANO 6 • O RASPÃO', 'PLANO 7 • O EGO', 'PLANO 8 • SÓ VOCÊ', 'PLANO 9 • DE PRIMEIRA', 'PLANO 10 • RUMO AO GOL', 'PLANO 11 • A REDE', 'PLANO 12 • O ESTÁDIO', 'PLANO 13 • O OLHAR DO RIN'],
    get subs() {
      const c = CE.luckCfg(TYPE);
      const me = CE.cinePlayerName();
      const NARR = '#94a3b8';
      const last = (CE.luckSubs(TYPE)[12] || [])[0];
      return [
        [{ from: 30, who: 'NARRADOR', text: c.stakes, color: NARR }],
        [{ from: 10, who: 'NARRADOR', text: 'O Sae com a bola. O Rin vai para cima dele.', color: NARR }],
        [],
        [{ from: 24, who: c.rivalName, text: `"${c.rivalLine}"`, color: c.rivalRim }],
        [{ from: 6, who: 'RIN ITOSHI', text: '"Sai da frente."', color: '#2dd4bf' }],
        [],
        [{ from: 30, who: me, text: '(Eu vejo onde ela vai cair.)', color: '#00f5d4' }],
        [{ from: 20, who: me, text: '(Só eu me mexo nesse mundo.)', color: '#00f5d4' }],
        [{ from: 96, who: 'NARRADOR', text: 'DE PRIMEIRA!!', color: NARR }],
        [{ from: 30, who: 'NARRADOR', text: `${c.gkShort} não alcança!`, color: NARR }],
        [{ from: 30, who: 'NARRADOR', text: c.goalCall, color: '#facc15' }],
        [{ from: 20, who: 'NARRADOR', text: c.goalSub, color: NARR }],
        last ? [last] : []
      ];
    },
    scene,
    overlay
  };
  CE.registerCine3D(TYPE, def);
})();
