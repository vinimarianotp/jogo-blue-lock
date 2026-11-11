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
  const ball = (K, p, o) => K.ball(p[0], p[1], p[2] || 0, o);
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
      // estufa na direção da câmera: os fios se abrem em volta da bola
      return [x + (dx / d) * k * 70, y + (dy / d) * k * 70];
    };
    ctx.save();
    ctx.strokeStyle = 'rgba(241,245,249,0.5)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= N + 2; i++) {
      ctx.beginPath();
      for (let j = 0; j <= 30; j++) {
        const y = top + ((bot - top) * j) / 30;
        const x = i * cell + (j % 2) * cell * 0.5;
        const [bx, by] = bulge(x, y);
        if (j) ctx.lineTo(bx, by);
        else ctx.moveTo(bx, by);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let j = 0; j <= 30; j++) {
        const y = top + ((bot - top) * j) / 30;
        const x = i * cell - (j % 2) * cell * 0.5 + cell * 0.5;
        const [bx, by] = bulge(x, y);
        if (j) ctx.lineTo(bx, by);
        else ctx.moveTo(bx, by);
      }
      ctx.stroke();
    }
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
      act(K, c.mates[0], P(2.4, lerp(9.2, 8.2, k)), { id: 'm0', face: P(2, 0), anim: 'run' });
      act(K, c.mates[1], P(1.0, lerp(10.2, 9.3, k)), { id: 'm1', face: P(1, 0), anim: 'run' });
      act(K, c.you, P(-2.4, lerp(10.4, 9.2, k)), { id: 'y', face: P(-2, 0), anim: 'run' });
      cam(K, mixP(P(3.9, 15.8, 6.3), P(1.75, 8.7, 1.3), k), mixP(P(0.2, 6.2, 0.3), P(-0.55, 2.6, 0.42), k), lerp(62, 46, k));
      st.you = W(P(-2.4, lerp(10.4, 9.2, k), 1.1));
    } else if (phase === 1) {
      // O SAE: câmera na altura da bola, de lado, acompanhando; o Rin entra pela direita
      const sd = lerp(1.75, 3.05, ease(t / 150));
      const rd = lerp(5.7, 3.95, easeIO(t / 150));
      act(K, c.rival, P(-0.45, sd), { id: 'rv', face: P(-0.45, 12), anim: 'run' });
      ball(K, P(-0.45 + Math.sin(t * 0.4) * 0.04, sd + 0.32, 0.05));
      act(K, c.rin, P(-0.25, rd), { id: 'rin', face: P(-0.45, sd), anim: 'run' });
      act(K, c.defender, P(0.5, lerp(4.5, 4.8, t / 150)), { id: 'df', face: P(-0.45, sd), anim: 'idle' });
      cam(K, shake(K, P(1.9, sd + 0.35, 0.3), f, 0.01), P(-0.45, sd + 0.2, 0.44), 44);
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
      // (de lado e de baixo, de longe o bastante para os dois inteiros; o refletor ao fundo)
      cam(K, shake(K, P(1.95, 4.3, 0.22), f, 0.004), P(-0.42, 3.62, 0.62 + up * 0.55), 50);
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
      cam(K, shake(K, P(-0.4 + Math.sin(t * 0.03) * 0.08, lerp(6.7, 7.15, k), 0.4), f, 0.012), P(-0.4, lerp(4.5, 5.25, k), 0.55), 48);
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
      cam(K, shake(K, P(lerp(2.1, 1.8, seg(A, 0, CL)), 5.75, 0.15), f * 2, A >= CL ? 0.035 * Math.max(0, 1 - tau / 30) : 0.004, 6), P(-0.4, 5.7, lerp(0.42, 1.55, tilt)), 46);
      st.clash = W(P(-0.4, 5.7, 0.45));
      st.ball = W(bp);
      st.clashT = t;
      st.CL = A >= CL;
    } else if (phase === 5) {
      // O RASPÃO: de cima — a bola passa raspando na cabeça do Aiku; sombras longas dos
      // refletores no gramado; o tempo desacelera até quase parar
      const tau = t < 38 ? 46 + t * 0.55 : 66.9 + (t - 38) * 0.15;
      const bp = flight(tau);
      ball(K, bp, { k: 0.9 });
      const jq = seg(tau, 50, 84);
      const jz = Math.sin(jq * Math.PI) * 0.62;
      const inAir = jq > 0 && jq < 1;
      act(K, c.defender, AIKU, { id: 'df', z: jz, face: P(-0.3, 6.2), anim: inAir ? 'jump' : 'idle', opts: inAir ? { animTime: jq * 40 } : undefined });
      const rp = P(-0.38, 6.25);
      const sp = P(-0.62, 5.7);
      act(K, c.rin, rp, { id: 'rin', face: P(-0.1, 4.9), frame: 0 });
      act(K, c.rival, sp, { id: 'rv', face: P(-0.1, 4.9), frame: 0 });
      // sombras do refletor do canto sudeste (para o noroeste)
      const tw = TOWERS[3];
      shadowFrom(K, tw, AIKU, jz, 1.25, 0.34, 0.75);
      shadowFrom(K, tw, rp, 0, 1.25, 0.34, 0.7);
      shadowFrom(K, tw, sp, 0, 1.25, 0.34, 0.7);
      shadowFrom(K, tw, bp, bp[2], 0.32, 0.16, 0.8);
      // do alto e inclinada (~50 graus): os bonecos são placas em pé, reto de cima somem
      const a = 0.35 - t * 0.0022;
      const ce = P(-0.1 + Math.sin(a) * 1.75, 4.9 + Math.cos(a) * 1.75, 2.35);
      cam(K, shake(K, ce, f * 0.5, t > 34 && t < 46 ? 0.012 : 0.002), P(-0.1, 4.85, 0.75), 48);
      st.graze = W(P(-0.1, 4.9, 1.62));
      st.ball = W(bp);
    } else if (phase === 6) {
      // O EGO: você parado lá atrás, contra o refletor — só os seus olhos acendem
      const yp = P(-1.6, 8.4);
      act(K, c.you, yp, { id: 'y', face: P(-0.1, 4.6), frame: 0, light: DARK });
      [[c.rin, 'rin', P(-0.38, 6.25)], [c.rival, 'rv', P(-0.62, 5.7)]].forEach(([ch, id, p]) => act(K, ch, p, { id, face: P(-0.1, 4.9), frame: 0, light: DARK }));
      act(K, c.defender, AIKU, { id: 'df', z: 0.12, face: P(-0.3, 6.2), anim: 'jump', opts: { animTime: 36 }, light: DARK });
      ball(K, flight(TAU_FROZEN), { k: 0.9 });
      const k = easeIO(t / 130);
      cam(K, P(lerp(-0.25, -0.5, k), lerp(6.1, 6.6, k), 0.55), P(-1.6, 8.4, 0.62), lerp(40, 33, k));
      st.eyes = W(P(-1.6, 8.4, 0.74));
      st.you = W(P(-1.6, 8.4, 0.45));
    } else if (phase === 7) {
      // SÓ VOCÊ: tudo parado e sem cor; você corre entre eles até a bola parada no ar
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
      cam(K, shake(K, P(yp[0] - GX + 1.0, yp[1] - GY + 1.25, 0.42), f * 0.5, 0.006), P(yp[0] - GX - 0.25, yp[1] - GY - 1.7, 0.75), 50);
      st.you = W([yp[0], yp[1], 0.45]);
      st.ball = W(bp);
      st.ballTop = W([bp[0], bp[1], 4.2]);
    } else if (phase === 8) {
      // DE PRIMEIRA: de perfil, rente ao chão; a bola desce e você chuta sem deixar quicar
      const KT = 90;
      const tau = TAU_FROZEN + seg(t, 0, KT) * (130 - TAU_FROZEN);
      const yp = t < 78 ? P(lerp(-0.3, KICK_AT[0] - GX, ease(t / 78)), lerp(5.05, KICK_AT[1] - GY + 0.02, ease(t / 78))) : KICK_AT;
      const an = t < 70 ? 'run' : t < KT ? 'windup' : 'shoot';
      act(K, c.you, yp, { id: 'y', face: P(0.4, 0), anim: an, frame: an === 'run' ? undefined : 1, opts: { showAura: t >= KT, auraColor: '#00f5d4' } });
      let bp;
      if (t < KT) bp = flight(tau);
      else {
        const q = (t - KT) / 50;
        bp = P(lerp(-0.1, 0.62, clamp(q)), 4.14 - (t - KT) * 0.12, 0.43 + (t - KT) * 0.008);
      }
      ball(K, bp, { k: 0.85 });
      act(K, c.defender, P(1.4, 3.6), { id: 'df', face: P(-0.1, 4.4), frame: 0 });
      const push = easeIO(seg(t, 0, KT));
      cam(K, shake(K, P(lerp(1.75, 1.45, push), 4.55, 0.28), f * 2, t >= KT ? 0.03 * Math.max(0, 1 - (t - KT) / 26) : 0.003, 3), P(-0.15, 4.35, 0.48), lerp(42, 36, push));
      st.foot = W(P(-0.1, 4.2, 0.35));
      st.ball = W(bp);
    } else if (phase === 9) {
      // RUMO AO GOL: atrás da bola; o Fukaku voa e não alcança
      const q = seg(t, 0, 84);
      const bp = P(lerp(0.0, 0.82, q), lerp(3.2, 0.1, q), lerp(0.5, 0.82, q));
      ball(K, bp, { k: 0.85 });
      const dq = seg(t, 20, 72);
      act(K, c.gk, P(lerp(-0.4, 0.6, ease(dq)), 0.55), { id: 'gk', z: Math.sin(dq * Math.PI) * 0.32, face: P(0, 9), anim: dq > 0 ? 'dive' : 'idle', opts: dq > 0 ? { animTime: dq * 30 } : undefined });
      cam(K, shake(K, [bp[0] - 0.25, bp[1] + 1.05, bp[2] + 0.12], f * 2, 0.01), [bp[0] + 0.12, bp[1] - 1.2, bp[2] - 0.05], 56);
      st.ball = W(bp);
    } else if (phase === 10) {
      // A REDE: de dentro do gol — a bola vem na cara da câmera e a rede estufa
      const HIT = 26;
      const bp = t < HIT ? P(lerp(0.75, 0.62, t / HIT), lerp(2.4, -0.3, t / HIT), lerp(0.8, 0.62, t / HIT)) : P(0.62, -0.32, Math.max(0.1, 0.62 - (t - HIT) * 0.012));
      ball(K, bp, { k: 0.9 });
      act(K, c.gk, P(-0.75, 0.9), { id: 'gk', face: P(-2, 0.9), anim: 'dive', opts: { animTime: 40 } });
      const cel = t > 60;
      act(K, c.you, P(lerp(-0.12, -0.9, seg(t, 60, 140)), lerp(4.42, 3.6, seg(t, 60, 140))), { id: 'y', face: cel ? P(-3, 2) : P(0.4, 0), anim: cel ? 'run' : 'shoot', frame: cel ? undefined : 1 });
      act(K, c.rin, P(-0.6, 6.0), { id: 'rin', face: P(0.4, 0), frame: 0 });
      cam(K, shake(K, P(0.35, -0.42, 0.46), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(0.25, 3.0, 0.5), 60);
      st.ball = W(bp);
      st.hit = t >= HIT;
    } else if (phase === 11) {
      // O ESTÁDIO: você de braços abertos contra os refletores; a grua sobe e mostra tudo
      const k = easeIO(seg(t, 30, 170));
      const yp = P(-1.4, 3.3);
      act(K, c.you, yp, { id: 'y', face: P(-1.4, 0), anim: 'celebrate', light: [lerp(0.35, 1, k), lerp(0.38, 1, k), lerp(0.48, 1.05, k)] });
      [[c.mates[0], 'm0', P(-0.2, lerp(6.4, 4.2, ease(seg(t, 10, 120))))], [c.mates[1], 'm1', P(-2.6, lerp(6.8, 4.4, ease(seg(t, 20, 130))))], [c.rin, 'rin', P(-0.5, 6.6)]].forEach(([ch, id, p], i) => act(K, ch, p, { id, face: yp, anim: i < 2 ? 'run' : 'idle', frame: i < 2 ? undefined : 0 }));
      // (a grua sobe por cima da área, sem sair do campo: atrás do gol já é arquibancada)
      cam(K, mixP(P(-1.2, 1.05, 0.36), P(-0.6, 0.9, 2.9), k), mixP(P(-1.4, 3.3, 0.68), P(-1.1, 7.2, 0.4), k), lerp(44, 60, k));
      st.you = W(P(-1.4, 3.3, 0.55));
    } else {
      // O OLHAR DO RIN: ele parado no meio da festa, olhando você comemorar lá na frente
      const k = easeIO(t / 140);
      act(K, c.rin, P(-0.5, 6.4), { id: 'rin', face: P(-1.4, 3.3), frame: 0, light: [0.62, 0.66, 0.78], opts: { expr: 'angry' } });
      act(K, c.you, P(-1.4, 3.3), { id: 'y', face: P(-1.4, 0), anim: 'celebrate' });
      act(K, c.mates[0], P(-0.9, 3.7), { id: 'm0', face: P(-1.4, 3.3), anim: 'celebrate' });
      act(K, c.mates[1], P(-2.0, 3.6), { id: 'm1', face: P(-1.4, 3.3), anim: 'celebrate' });
      act(K, c.rival, P(1.2, 5.6), { id: 'rv', face: P(-0.5, 6.4), frame: 0 });
      cam(K, P(lerp(1.05, 0.85, k), lerp(8.6, 8.2, k), 0.72), P(lerp(-0.9, -1.0, k), 4.7, 0.6), lerp(46, 40, k));
    }
  }

  // ---------------------------------------------------------------- quadros de mangá (cut-ins)
  // Os closes são ilustração em alta resolução (js/cine_art.js), nunca o boneco ampliado.
  const CAa = () => CE.ART;
  // "Ainda fraco, Rin.": o olhar frio do Sae (em cima, entra pela direita) e o do Rin, bravo
  // (embaixo, entra pela esquerda), em quadros diagonais
  function cutEyes(ctx, S, c, kA, kB, t) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const sh = bot - top;
    ctx.save();
    ctx.fillStyle = `rgba(2,6,23,${0.35 * Math.max(kA, kB)})`;
    ctx.fillRect(0, top, W, sh);
    ctx.restore();
    const drift = t * 0.12;
    CA.panel(
      ctx,
      [[W * 0.42, top + 16], [W - 16, top + 16], [W - 16, top + sh * 0.42], [W * 0.36, top + sh * 0.48]],
      (b) => {
        CA.eyes(ctx, b.x + b.w * 0.55 + b.ox - drift, b.y + b.h * 0.52, b.w * 0.62, { cd: c.rival, expr: 'calm' });
        CA.halftone(ctx, b.x, b.y, b.w, b.h, { from: 'bottom', color: 'rgba(15,23,42,0.22)', step: 8, max: 0.7 });
      },
      { k: kA, from: [W * 0.6, 0] }
    );
    CA.panel(
      ctx,
      [[16, top + sh * 0.56], [W * 0.6, top + sh * 0.5], [W * 0.64, bot - 16], [16, bot - 16]],
      (b) => {
        CA.eyes(ctx, b.x + b.w * 0.45 + b.ox + drift, b.y + b.h * 0.5, b.w * 0.6, { cd: c.rin, expr: 'angry', glow: '#2dd4bf', glowK: 0.5 });
        CA.halftone(ctx, b.x, b.y, b.w, b.h, { from: 'bottom', color: 'rgba(15,23,42,0.25)', step: 8, max: 0.75 });
      },
      { k: kB, from: [-W * 0.6, 0] }
    );
  }
  // o chapéu: o calcanhar do Sae levantando a bola, linhas subindo
  function cutHeel(ctx, S, c, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const sh = bot - top;
    const cd = c.rival || {};
    CA.panel(
      ctx,
      [[W * 0.56, bot - sh * 0.5], [W - 16, bot - sh * 0.57], [W - 16, bot - 16], [W * 0.5, bot - 16]],
      (b) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        CA.speedLines(ctx, -Math.PI / 2 + 0.25, W, S.H, { color: 'rgba(15,23,42,0.5)', n: 46, t: q * 60, speed: 30, thick: 3 });
        const e = ease(q * 1.6);
        CA.boot(ctx, b.x + b.w * 0.36 + b.ox, b.y + b.h * 0.8, b.h * 0.16, { sock: cd.jerseyPrimary || '#f8fafc', sock2: cd.jerseySecondary || '#dc2626', boot: '#facc15', ang: lerp(0.35, -0.75, e), flip: true });
        CA.ball(ctx, b.x + b.w * 0.6 + b.ox, b.y + b.h * (0.74 - 0.5 * ease(q)), b.h * 0.13, { rot: q * 7, blur: [0, -26 * (1 - q)] });
        CA.halftone(ctx, b.x, b.y, b.w, b.h, { from: 'bottom', color: 'rgba(15,23,42,0.25)', step: 9, max: 0.6 });
      },
      { k: kIn, from: [W * 0.5, 0] }
    );
  }
  // antes do chute: quadro grande, sua chuteira indo na bola; sem cor (o tempo parou), só o
  // seu ciano; no último instante a estrela de impacto atrás da bola
  function cutKick(ctx, S, c, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]],
      (b) => {
        ctx.fillStyle = '#dbe4ef';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        const bx = b.x + b.w * 0.63;
        const by = b.y + b.h * (0.4 + 0.06 * q);
        CA.speedRadial(ctx, bx, by, W, S.H, { color: 'rgba(15,23,42,0.75)', inner: b.h * 0.22, n: 110 });
        if (q > 0.82) CA.burst(ctx, bx, by, b.h * 0.3 * ease((q - 0.82) / 0.18), { fill: '#f8fafc', stroke: '#0b0f19', lw: 5 });
        CA.ball(ctx, bx, by, b.h * 0.17, { rot: q * 3 });
        CE.cineGlow(ctx, bx, by, b.h * 0.3, 'rgba(0,245,212,0.35)', 0.9);
        const e = easeIO(q);
        CA.boot(ctx, b.x + b.w * lerp(0.16, 0.47, e), b.y + b.h * lerp(0.95, 0.66, e), b.h * 0.15, { sock: '#64748b', sock2: '#e2e8f0', boot: '#22d3ee', ang: lerp(1.0, -0.15, e) });
        CA.halftone(ctx, b.x, b.y, b.w, b.h, { from: 'bottom', color: 'rgba(15,23,42,0.22)', step: 10, max: 0.6 });
      },
      { k: kIn, from: [0, 50] }
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
      if (st.you && t > 100) CE.luckKicker(ctx, Math.max(30, st.you.x - 60), st.you.y - 40, `▼ ${CE.cinePlayerName()} • LIVRE`, seg(t, 100, 118), '#00f5d4');
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
      // "Ainda fraco, Rin.": os olhos dos dois em quadros diagonais
      if (t > 26 && t < 104) cutEyes(ctx, S, c, seg(t, 26, 36), seg(t, 48, 58), t);
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
      // o raspão: um risco de luz e a cor indo embora em círculo a partir dali
      const g = st.graze;
      if (g && t > 30 && t < 52) {
        const q = seg(t, 30, 52);
        CE.cineGlow(ctx, g.x, g.y, 80, 'rgba(255,255,255,0.8)', 1 - q);
        if (t < 42) CE.drawRadialSpeedLines(ctx, g.x, g.y, W, '#f8fafc', 0.3 * (1 - q));
      }
      if (g && t >= 38) bwBlue(ctx, W, H, 1, { inside: true, x: g.x, y: g.y, r: ease(seg(t, 38, 110)) * W * 1.3 });
      CE.cineSfx(S, 38, 'raspao', () => window.SFX?.whoosh?.());
    } else if (phase === 6) {
      bwBlue(ctx, W, H, 1);
      // contraluz: brilho atrás de você e só os olhos acesos
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 150, 'rgba(186,230,253,0.18)', 0.9);
      if (st.eyes) {
        const on = seg(t, 40, 56);
        [-7, 7].forEach((dx) => {
          CE.cineGlow(ctx, st.eyes.x + dx, st.eyes.y, 22, 'rgba(0,245,212,0.9)', on);
          CE.cineGlow(ctx, st.eyes.x + dx, st.eyes.y, 7, 'rgba(240,253,250,1)', on);
        });
      }
      CE.cineSfx(S, 40, 'olhos', () => window.SFX?.whoosh?.());
    } else if (phase === 7) {
      bwBlue(ctx, W, H, 1);
      // a bola parada no ar num feixe de luz; você com o brilho ciano
      if (st.ball && st.ballTop) CE.cineShafts(ctx, st.ball.x, Math.max(top - 40, st.ballTop.y), Math.PI / 2, Math.max(80, st.ball.y - st.ballTop.y + 30), 0.3, 4, '241,245,249', 0.16, t);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(255,255,255,0.5)', 0.9);
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 90, 'rgba(0,245,212,0.35)', 0.8);
      CE.luckKicker(ctx, 40, top + 30, 'O TEMPO PAROU', seg(t, 8, 30), '#93c5fd');
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
      netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - (t - HIT) / 40) * Math.abs(Math.cos((t - HIT) * 0.25)) : 0);
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
      const k2 = seg(t, 100, 124);
      if (k2 > 0) {
        CE.luckKicker(ctx, W / 2 - 160, top + 54, c.kicker, k2, '#e2e8f0');
        CE.cineImpactText(ctx, c.bigTitle, W / 2, top + 130, 84, '#f8fafc', k2, W * 0.8, 0);
      }
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
