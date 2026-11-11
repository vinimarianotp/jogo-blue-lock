// ============================================================================
// CUTSCENES EM 3D DA PARTIDA — refeitas como cinema, no padrão do gol da Sub-20
// (js/cine3d_u20.js; regras em docs/DIRECAO_DE_ARTE.md): câmera sempre viva (grua,
// travelling, push-in), câmera lenta com rampa nos 1–2 momentos-chave, um quadro de
// impacto no golpe principal, preto e branco azulado no "tempo parado", closes só em
// quadros de mangá em pixel art (chuteira, bola, peça) e pouco texto na tela.
// Kit: js/cine3d_kit.js.
//   scripted_shot             • gol garantido do roteiro (CE.ptdShotCfg)
//   chem_reaction             • reação química com o parceiro (CE.ptdChemCtx)
//   first_selection_awakening • seu 1º gol no cap. 2 (Time Z x Time V)
//   nel_metavision_goal       • seu 1º gol na NEL (Metavision)
//   u20_final_goal            • o gol do título da Copa Sub-20 (Japão x França): o Loki
//                               conduz, o Rin se choca com ele, o Hugo marca você e você
//                               faz o gol de bicicleta (filme próprio)
// (o u20_direct_shoot, o gol da Sub-20 do Japão, é registrado em js/cine3d_u20.js)
// Campo: x45–60 y6–22, gols no norte (y 6,6) e no sul (y 22,4), centrados em x 53.
// Pontos [x, y, z] (z = altura); u = de lado, d = distância da linha do gol atacado.
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
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...] (rampa nas pontas)
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };

  const YOU = '#00f5d4';
  const NARR = '#94a3b8';

  // ---------------------------------------------------------------- campo
  const GX = 53;
  // quem ataca o gol norte (casa) ou o sul (rival): u e d viram x, y do campo
  const atk = (away) => ({ gy: away ? 22.4 : 6.6, sy: away ? -1 : 1, sx: away ? -1 : 1, away: !!away });
  const pt = (A, u, d, z = 0) => [GX + u * A.sx, A.gy + d * A.sy, z];
  // câmera com pontos [x, y, z]
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  // (o kit guarda os bonecos pelo nome: boneco sem nome ganha um, senão dois sem nome viram o mesmo)
  const act = (K, who, p, o = {}) => {
    if (who && typeof who === 'object' && !who.name) who = Object.assign({}, who, { name: '_' + (o.id || '') });
    return K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const ball = (K, p, o) => K.ball(p[0], p[1], p[2] || 0, o);
  // tremida de câmera na mão (ruído suave, nunca aleatório por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // A cena guarda pontos do MUNDO (wp) e o overlay projeta na tela (resolve): a matriz da
  // câmera (K.VP) só fica pronta depois do desenho 3D
  const wp = (p) => (p ? { __w: p } : null);
  const resolve = (K, v) => {
    if (!v || typeof v !== 'object') return v;
    if (v.__w) return K.screen(v.__w[0], v.__w[2] || 0, v.__w[1]);
    if (Array.isArray(v)) return v.map((x) => resolve(K, x)).filter((x, i) => x !== null || !(v[i] && v[i].__w));
    const o = {};
    for (const k in v) o[k] = resolve(K, v[k]);
    return o;
  };
  // torres dos refletores do campo (as lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;
  // meião e cor de chuteira de um boneco (para os quadros de mangá)
  const sockOf = (cd, boot) => ({ sock: (cd && cd.jerseyPrimary) || '#1d4ed8', sock2: (cd && cd.jerseySecondary) || '#f8fafc', boot: boot || '#f8fafc' });

  // ---------------------------------------------------------------- texturas
  const mk = (w, h, fn) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    fn(c.getContext('2d'), w, h);
    return c;
  };
  // anel em pixel no gramado (marca de ponto futuro / leitura), um por cor
  const RINGS = {};
  const ringCv = (color) =>
    RINGS[color] ||
    (RINGS[color] = mk(32, 32, (g) => {
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
          if (d > 13 && d < 15.5) {
            g.fillStyle = color;
            g.fillRect(x, y, 1, 1);
          } else if (d <= 13 && d > 11.5) {
            g.fillStyle = rgba(color, 0.35);
            g.fillRect(x, y, 1, 1);
          }
        }
      }
    }));
  const ring = (K, p, r, color, alpha = 1) => {
    if (alpha <= 0.01) return;
    K.floor({ x0: p[0] - r, y0: p[1] - r, x1: p[0] + r, y1: p[1] + r, z: 0.012, img: ringCv(color), em: true, alpha });
  };
  // onda de luz no chão (o choque e o chute levantam a grama)
  let WAVE = null;
  const waveCv = () =>
    WAVE ||
    (WAVE = mk(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.7, 'rgba(224,242,254,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    }));
  // a onda e a grama voando em volta de cp (tau = quadros desde o golpe)
  function groundHit(K, cp, tau, color = '#e0f2fe', n = 16, seed = 3) {
    if (tau < 0) return;
    const q = seg(tau, 0, 30);
    const r = 0.15 + ease(q) * 1.2;
    K.floor({ x0: cp[0] - r, y0: cp[1] - r, x1: cp[0] + r, y1: cp[1] + r, z: 0.012, img: waveCv(), color, alpha: 1 - q, em: true });
    for (let i = 0; i < n; i++) {
      const a = rnd(i, seed) * TAU;
      const d = Math.min(1.1, tau * (0.012 + rnd(i, seed + 1) * 0.02));
      const z = Math.max(0, tau * (0.02 + rnd(i, seed + 2) * 0.02) - tau * tau * 0.0006);
      const x = cp[0] + Math.cos(a) * d;
      const y = cp[1] + Math.sin(a) * d;
      K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.04, color: '#4ade80', alpha: 1 - seg(tau, 30, 46) });
    }
  }
  // faixa reta deitada no gramado (linha de leitura do Metavision), de a até b
  function floorLine(K, a, b, w, color, alpha) {
    if (alpha <= 0.01) return;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const px = (-dy / L) * (w / 2);
    const py = (dx / L) * (w / 2);
    const h = 0.014;
    const V = (x, y, u, v) => [x, h, y, u, v, 0, 1, 0];
    const v = [].concat(V(a[0] + px, a[1] + py, 0, 0), V(a[0] - px, a[1] - py, 1, 0), V(b[0] - px, b[1] - py, 1, 1), V(a[0] + px, a[1] + py, 0, 0), V(b[0] - px, b[1] - py, 1, 1), V(b[0] + px, b[1] + py, 0, 1));
    K._push(v, { color, alpha, em: true });
  }

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom azulado (o "tempo parado"); circle.inside: só dentro do círculo
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
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.22)'], [0.8, 14, 'rgba(250,204,21,0.2)'], [1.3, 40, 'rgba(99,102,241,0.14)']].forEach(([fr, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * fr * 2, p.y + (cy - p.y) * fr * 2, r, col, k);
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
  // A REDE de dentro do gol: a câmera no canto, a bola vem na cara dela, o goleiro pula
  // atrasado (longe da lente, senão vira uma mancha) e a rede estufa no overlay (netOverlay).
  // a = tempo da ação; o = { cu (u do canto: lado da bola), cz, from [u, d, z], hit, keeper }
  function netShot(K, S, A, a, o) {
    const cu = o.cu;
    const end = pt(A, cu * 0.82, 0.12, o.cz ?? 0.7);
    const bp = a < o.hit ? mixP(pt(A, o.from[0], o.from[1], o.from[2]), end, easeIn(a / o.hit)) : pt(A, cu * 0.82, 0.1 - Math.min(0.1, (a - o.hit) * 0.004), Math.max(0.1, end[2] - easeIn(seg(a - o.hit, 4, 44)) * end[2]));
    if (a < o.hit + 14) ball(K, bp);
    const dq = seg(a, o.hit - 22, o.hit + 6);
    act(K, o.keeper, pt(A, lerp(0, cu * 0.62, ease(dq)), 1.15, Math.sin(dq * Math.PI) * 0.28), { id: 'gk', face: pt(A, cu * 6, 1.15), anim: dq > 0.05 ? 'dive' : 'idle', frame: dq > 0.05 ? undefined : 0, opts: dq > 0.05 ? { animTime: dq * 30 } : undefined });
    const since = a - o.hit;
    cam(K, shake(K, pt(A, cu * 0.68, -0.46, 0.52), S.f * 2, since >= 0 ? 0.022 * Math.max(0, 1 - since / 30) : 0.003, 5), pt(A, cu * 0.15, 3.0, 0.5), 60);
    K.st.ball = wp(bp);
    K.st.hit = since >= 0;
    K.st.since = since;
    return bp;
  }
  // o overlay da rede: estufa onde a bola bateu, clarão e o grito (onomatopeia)
  function netShotOverlay(ctx, S, st, word = 'GOOOL!!', size = 140) {
    const { W, H, top, bot } = S;
    const u = st.since || 0;
    netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - u / 40) * Math.abs(Math.cos(u * 0.25)) : 0);
    if (st.hit) {
      CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 0, 10)));
      hitWord(ctx, word, W / 2, top + (bot - top) * 0.44, size, seg(u, 4, 12), u - 20, W * 0.88, -0.06);
    }
  }
  // onomatopeia do golpe: entra com o soco (k) e some aos poucos depois de ~1 s (u = quadros desde o golpe)
  function hitWord(ctx, text, x, y, size, k, u, maxW, rot) {
    const a = 1 - seg(u, 50, 64);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    CE.cineImpactText(ctx, text, x, y, size, '#f8fafc', k, maxW, rot);
    ctx.restore();
  }
  // confete caindo na comemoração
  function confetti(ctx, S, t, k = 1) {
    const { W, top, bot } = S;
    ctx.save();
    ctx.globalAlpha = k;
    for (let i = 0; i < 70; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
      ctx.fillStyle = ['#00f5d4', '#facc15', '#f8fafc', '#38bdf8', '#ef4444'][i % 5];
      ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 6, 9);
    }
    ctx.restore();
  }
  // fundo preto (fim da cena)
  const fadeOut = (ctx, S, k) => {
    if (k <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${clamp(k)})`;
    ctx.fillRect(0, 0, S.W, S.H);
  };

  // ---------------------------------------------------------------- quadros de mangá
  // Os closes são desenhados em baixa resolução e ampliados sem suavizar (pixel: 6, a escala
  // dos bonecos), nunca o boneco ampliado. O quadro entra deslizando e sai em corte seco.
  const PIX = 6;
  // quadro grande com a chuteira indo na bola. o = { poly, from, bg, ink, radial, lineAng,
  // bx, by (bola, fração do quadro), ballR, glow, burst (q de onde sai a estrela), f0, f1
  // (pé: fração do quadro no começo/fim), a0, a1 (inclinação da perna), sock, sock2, boot, flip }
  function cutBoot(ctx, S, kIn, q, o) {
    const CA = CE.ART;
    if (!CA || kIn <= 0) return;
    CA.panel(
      ctx,
      o.poly,
      (b, g) => {
        g.fillStyle = o.bg || '#dbe4ef';
        g.fillRect(b.x, b.y, b.w, b.h);
        const bx = b.x + b.w * (o.bx ?? 0.63);
        const by = b.y + b.h * (o.by ?? 0.42);
        if (o.radial === false) CA.speedLines(g, o.lineAng || 0, S.W, S.H, { color: o.ink || 'rgba(15,23,42,0.55)', n: 30, t: q * 60, speed: 30, thick: 8 });
        else CA.speedRadial(g, bx, by, S.W, S.H, { color: o.ink || 'rgba(15,23,42,0.8)', inner: b.h * 0.22, n: 60, thick: 1.8 });
        if (o.burst !== undefined && q > o.burst) CA.burst(g, bx, by, b.h * 0.3 * ease((q - o.burst) / (1 - o.burst)), { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
        if (o.glow) {
          g.fillStyle = o.glow;
          g.beginPath();
          g.arc(bx, by, b.h * 0.24, 0, TAU);
          g.fill();
        }
        if (o.ball !== false) CA.ball(g, bx, by, b.h * (o.ballR || 0.17), { rot: q * 3 });
        const e = easeIO(q);
        const f0 = o.f0 || [0.16, 0.95];
        const f1 = o.f1 || [0.47, 0.66];
        CA.boot(g, b.x + b.w * lerp(f0[0], f1[0], e), b.y + b.h * lerp(f0[1], f1[1], e), b.h * (o.bootS || 0.15), { sock: o.sock || '#64748b', sock2: o.sock2 || '#e2e8f0', boot: o.boot || '#22d3ee', ang: lerp(o.a0 ?? 1.0, o.a1 ?? -0.15, e), flip: o.flip });
        if (o.extra) o.extra(b, g, q);
      },
      { k: kIn, from: o.from || [0, 50], pixel: PIX }
    );
  }
  // peça de quebra-cabeça (quadrado com encaixe em cima e na direita) para o quadro da 1ª Seleção
  function puzzlePiece(g, x, y, s, fill, line) {
    const r = s * 0.17;
    g.beginPath();
    g.rect(x - s / 2, y - s / 2, s, s);
    g.moveTo(x + r, y - s / 2);
    g.arc(x, y - s / 2 - r * 0.6, r, 0, TAU);
    g.moveTo(x + s / 2 + r * 0.6 + r, y);
    g.arc(x + s / 2 + r * 0.6, y, r, 0, TAU);
    g.fillStyle = fill;
    g.fill('nonzero');
    if (line) {
      g.strokeStyle = line;
      g.lineWidth = Math.max(6, s * 0.05);
      g.strokeRect(x - s / 2, y - s / 2, s, s);
    }
  }

  // =========================================================================
  // 1) GOL GARANTIDO DO ROTEIRO (scripted_shot)
  // A arrancada com o marcador no carrinho (pula por cima, em câmera lenta) → o tempo
  // congela (sem cor) e o quadro da chuteira na cor da habilidade → o chute (quadro de
  // impacto, a cor volta) → de dentro do gol, a rede estufa → a comemoração.
  // =========================================================================
  const SHOT_SLIDE = 60; // (tempo da ação) o carrinho
  const SHOT_REMAP = [[0, 0], [50, 50], [92, 64], [110, 82]];
  const shotRun = (a) => {
    const sd = lerp(9.8, 5.5, ease(a / 100));
    const hop = a > SHOT_SLIDE && a < SHOT_SLIDE + 20 ? Math.sin(((a - SHOT_SLIDE) / 20) * Math.PI) * 0.26 : 0;
    const d0 = lerp(9.8, 5.5, ease(SHOT_SLIDE / 100)) - 0.85;
    const dd = a < SHOT_SLIDE ? lerp(2.4, d0, ease(a / SHOT_SLIDE)) : lerp(d0, d0 + 1.9, ease((a - SHOT_SLIDE) / 34));
    return { sd, hop, dd };
  };
  const SHOT_AT = [-0.35, 5.3]; // onde ele arma o chute (u, d)
  const SHOT_KT = 16;
  // a bola do chute rumo ao ângulo (q 0..1)
  const shotFly = (A, q) => pt(A, lerp(-0.3, 0.72, q), lerp(5.0, -0.1, q), lerp(0.12, 0.84, Math.sin(clamp(q) * Math.PI * 0.5)));

  CE.registerCine3D('scripted_shot', {
    phases: [110, 100, 100, 110, 110],
    music: 'tension',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    get title() {
      const c = CE.ptdShotCfg();
      return `⚽ GOL GARANTIDO • ${String(c.shooterName || '').toUpperCase()}`;
    },
    get tags() {
      const c = CE.ptdShotCfg();
      return ['PLANO 1 • A ARRANCADA', 'PLANO 2 • O TEMPO CONGELA', `PLANO 3 • ${String(c.weaponName || 'O CHUTE').toUpperCase()}`, `PLANO 4 • A REDE`, `PLANO 5 • ${c.homeAfter} x ${c.awayAfter}`];
    },
    get subs() {
      const c = CE.ptdShotCfg();
      const away = c.team === 'away';
      const col = away ? '#ef4444' : YOU;
      const who = String(c.shooterName || '').toUpperCase();
      const shout = `"${String(c.skillName || '').replace(/\s*\(.*\)\s*$/, '')}!!"`;
      return [
        [{ from: 4, who: 'NARRADOR', text: 'Livre! Parte pra cima!', color: NARR }],
        [{ from: 22, who: 'NARRADOR', text: 'O tempo congela...', color: NARR }],
        [{ from: 4, who, text: shout, color: col }],
        [],
        [{ from: 2, who: 'NARRADOR', text: away ? 'A rede estufa... o rival marca!' : 'A rede estufa! Seu time marca!', color: away ? '#fca5a5' : NARR }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.ptdShotCtx();
      const { c } = o;
      const A = atk(o.away);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase !== 3) act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 10), frame: 0 });
      if (phase === 0) {
        // A ARRANCADA: travelling de lado, baixo; no pulo a câmera lenta e a câmera gira um pouco
        const a = remap(t, SHOT_REMAP);
        const r = shotRun(a);
        const slid = a >= SHOT_SLIDE;
        act(K, c.defender, pt(A, -0.42, r.dd), { id: 'def', face: pt(A, -0.45, 30), anim: slid ? 'slide' : 'run' });
        act(K, c.shooter, pt(A, -0.5, r.sd, r.hop), { id: 'sh', face: pt(A, -0.5, 0), anim: 'run' });
        ball(K, pt(A, -0.5 + Math.sin(a * 0.4) * 0.04, r.sd - 0.3, 0.05 + r.hop * 0.8));
        groundHit(K, pt(A, -0.42, r.dd), a - SHOT_SLIDE, '#e0f2fe', 12, 5);
        const orb = easeIO(seg(t, 44, 104)) * 0.55;
        const R = 2.45;
        const e = pt(A, -0.5 + Math.cos(orb) * R, r.sd - 0.3 - Math.sin(orb) * R, lerp(0.42, 0.3, orb / 0.55));
        cam(K, shake(K, e, f * 0.6, 0.008), pt(A, -0.5, r.sd - 0.45, 0.4), 44);
        st.slow = seg(t, 50, 60) * (1 - seg(t, 92, 104));
      } else if (phase === 1) {
        // O TEMPO CONGELA: de frente e baixo, a câmera chegando; a cor some em círculo da bola
        const sp = pt(A, SHOT_AT[0], SHOT_AT[1]);
        act(K, c.shooter, sp, { id: 'sh', face: pt(A, 0.3, 0), anim: t < 22 ? 'run' : 'windup', frame: t < 22 ? undefined : 1 });
        act(K, c.defender, pt(A, -0.42, 6.75), { id: 'def', face: pt(A, -0.45, 30), anim: 'slide', opts: { animTime: 99 } });
        const bp = pt(A, SHOT_AT[0] + 0.05, SHOT_AT[1] - lerp(0.12, 0.3, ease(t / 30)), 0.06);
        ball(K, bp);
        const k = easeIO(t / 100);
        cam(K, shake(K, pt(A, lerp(1.45, 1.15, k), lerp(2.75, 3.05, k), lerp(0.34, 0.4, k)), f * 0.4, 0.004), pt(A, SHOT_AT[0] + 0.1, SHOT_AT[1] - 0.1, 0.42), lerp(44, 38, k));
        st.ball = wp(bp);
      } else if (phase === 2) {
        // O CHUTE: de lado, rente ao chão — quadro de impacto, a cor volta, a bola some no ângulo
        const sp = pt(A, SHOT_AT[0], SHOT_AT[1]);
        const hit = t >= SHOT_KT;
        act(K, c.shooter, sp, { id: 'sh', face: pt(A, 0.3, 0), anim: hit ? 'shoot' : 'windup', frame: 1 });
        act(K, c.defender, pt(A, -0.42, 6.75), { id: 'def', face: pt(A, -0.45, 30), anim: 'slide', opts: { animTime: 99 } });
        const u = Math.max(0, t - SHOT_KT);
        const bp = hit ? shotFly(A, easeIn(seg(u, 0, 40))) : pt(A, SHOT_AT[0] + 0.05, SHOT_AT[1] - 0.3, 0.06);
        ball(K, bp);
        groundHit(K, pt(A, SHOT_AT[0], SHOT_AT[1] - 0.3), u - 0.01, '#e0f2fe', 14, 7);
        // (depois do chute a câmera só acompanha um pouco a bola: quem chutou fica no quadro)
        const pan = ease(seg(u, 8, 44)) * 0.2;
        const look = mixP(pt(A, SHOT_AT[0], SHOT_AT[1] - 0.25, 0.4), pt(A, 0.3, 1.6, 0.6), pan);
        cam(K, shake(K, pt(A, 1.85, SHOT_AT[1] - 0.15, 0.24), f * 2, hit ? 0.03 * Math.max(0, 1 - u / 26) : 0.003, 3), look, 42);
        st.foot = wp(pt(A, SHOT_AT[0] + 0.05, SHOT_AT[1] - 0.3, 0.12));
        st.ball = wp(bp);
      } else if (phase === 3) {
        // A REDE: de dentro do gol — a bola vem, o goleiro pula atrasado e a rede estufa
        const a = remap(t, [[0, 0], [18, 18], [40, 26], [110, 96]]);
        netShot(K, S, A, a, { cu: 0.7, cz: 0.72, from: [0.1, 3.4, 0.6], hit: 26, keeper: c.keeper });
        act(K, c.shooter, pt(A, lerp(SHOT_AT[0], -0.9, seg(a, 40, 96)), lerp(SHOT_AT[1], 4.2, seg(a, 40, 96))), { id: 'sh', face: a > 40 ? pt(A, -3, 2) : pt(A, 0.3, 0), anim: a > 40 ? 'run' : 'shoot', frame: a > 40 ? undefined : 1 });
      } else {
        // A COMEMORAÇÃO: a grua sobe de quem fez o gol até o estádio
        const k = easeIO(seg(t, 10, 110));
        const sp = pt(A, -1.2, 3.0);
        act(K, c.shooter, sp, { id: 'sh', face: pt(A, -1.2, 0), anim: 'celebrate' });
        act(K, c.defender, pt(A, 0.7, 4.5), { id: 'def', face: pt(A, 0.7, 12), anim: 'kneel_one' });
        cam(K, mixP(pt(A, -1.0, 0.95, 0.38), pt(A, -0.6, 0.7, 2.2), k), mixP(pt(A, -1.2, 3.0, 0.62), pt(A, -1.0, 5.6, 0.3), k), lerp(44, 56, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, phase } = S;
      const o = CE.ptdShotCtx();
      const { c, color } = o;
      const st = resolve(K, K.st || {});
      const scoreBefore = () => CE.ptdScore(ctx, 32, top + 16, CE.ptdShotScore(o, c.homeBefore, c.awayBefore));
      if (phase === 0) {
        flares(ctx, K, S, 0.6);
        CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.06);
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.22 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 52, 'slide', () => window.SFX?.tackle?.());
        CE.ptdScore(ctx, 32, top + 16, Object.assign(CE.ptdShotScore(o, c.homeBefore, c.awayBefore), { k: seg(t, 4, 16) }));
      } else if (phase === 1) {
        // a cor vai embora em círculo da bola; depois o quadro da chuteira na cor do golpe
        const b = st.ball || { x: W / 2, y: H * 0.7 };
        bwBlue(ctx, W, H, 1, { inside: true, x: b.x, y: b.y, r: ease(seg(t, 16, 60)) * W * 1.3 });
        if (st.ball) CE.cineGlow(ctx, b.x, b.y, 40, 'rgba(255,255,255,0.45)', seg(t, 30, 50));
        if (t > 56) {
          const { top: T, bot: B } = S;
          cutBoot(ctx, S, seg(t, 56, 64), seg(t, 56, 100), {
            poly: [[40, T + 24], [W - 30, T + 12], [W - 50, B - 24], [24, B - 40]],
            from: [0, 50],
            glow: rgba(color, 0.4),
            burst: 0.86,
            sock: '#64748b',
            sock2: '#e2e8f0',
            boot: color,
            flip: o.away
          });
        }
        CE.cineSfx(S, 20, 'congela', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const fp = st.foot || { x: W * 0.45, y: H * 0.7 };
        const KT = SHOT_KT;
        if (t < KT) bwBlue(ctx, W, H, 1);
        else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, KT, KT + 16)) * W * 1.4 });
        if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
        if (t >= KT) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
          if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
          if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 4, 24, rgbOf(color).join(','), 0.8 * (1 - seg(t, KT + 26, KT + 46)));
          hitWord(ctx, 'DOM!!', W * 0.74, top + 120, 110, seg(t, KT, KT + 6), t - KT, W * 0.4, -0.1);
        }
        CE.cineSfx(S, KT, 'chute', () => window.SFX?.kick?.(1));
        scoreBefore();
      } else if (phase === 3) {
        if (!st.hit && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, rgba(color, 0.4));
        netShotOverlay(ctx, S, st);
        CE.cineSfx(S, 40, 'rede', o.away ? () => window.SFX?.concede?.() : () => window.SFX?.goal?.(true));
        scoreBefore();
      } else {
        flares(ctx, K, S, 0.9);
        if (!o.away) confetti(ctx, S, t, seg(t, 6, 20));
        const flip = 12;
        CE.ptdScore(ctx, 32, top + 16, CE.ptdShotScore(o, t >= flip ? c.homeAfter : c.homeBefore, t >= flip ? c.awayAfter : c.awayBefore, o.away ? 'away' : 'home', seg(t, flip, flip + 16)));
        CE.cineSfx(S, flip, 'placar', () => window.SFX?.blip?.(880));
      }
    }
  });

  // =========================================================================
  // 2) REAÇÃO QUÍMICA (chem_reaction)
  // Os dois veem o mesmo lance (plano e contraplano, mesmo enquadramento) e dois quadros de
  // mangá lado a lado, cada um na sua cor → a jogada do parceiro do jeito dele (câmera lenta
  // no passe) → um só chute (quadro de impacto) → atrás da bola rumo ao gol (sem o resultado:
  // a partida continua).
  // =========================================================================
  // altura da bola no pé de quem finaliza (de primeira, de voleio, de bicicleta)
  const FIN_Z = { shoot: 0.06, volley: 0.36, bicycle: 0.62 };
  const FIN_AIR = { shoot: 0, volley: 0.2, bicycle: 0.42 };
  // A jogada do parceiro no plano 2 (u, d, z em coordenadas de ataque)
  function chemPlay(o, t) {
    const st = o.st;
    const r = { kick: 46, p: [-2.2, 7.0, 0], anim: 'idle', defs: [], held: null };
    if (st.kind === 'dribble') {
      r.kick = 80;
      r.p = [-2.4, lerp(9.4, 6.6, ease(t / 76)), 0];
      r.anim = t < r.kick ? (Math.floor(t / 12) % 2 ? 'rabona' : 'run') : 'shoot';
      [[-2.35, 8.2], [-2.15, 7.25]].forEach(([u, d], i) => {
        const beaten = r.p[1] < d - 0.25;
        r.defs.push({ who: i ? 'a' : 'b', p: [u + (beaten ? 0.5 : 0), d, beaten ? 0.08 : 0], anim: beaten ? 'dive' : 'idle', face: beaten ? [u + 3, d] : [r.p[0], r.p[1]] });
      });
      if (t < r.kick) r.held = [r.p[0] + Math.sin(t * 0.4) * 0.12, r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'trap') {
      r.kick = 70;
      const fall = Math.min(1, t / 34);
      if (t < 34) r.held = [-2.1, 6.75, lerp(3.4, 0.06, fall * fall)];
      else if (t < r.kick) {
        r.held = [-2.1, 6.75, 0.06];
        r.rings = [-2.1, 6.75, 0.06];
      }
      r.anim = t < r.kick ? 'idle' : 'shoot';
    } else if (st.kind === 'sprint') {
      r.kick = 58;
      r.p = [-2.2, lerp(12.6, 6.9, ease(t / 55)), 0];
      r.anim = t < r.kick ? 'run' : 'shoot';
      if (t < r.kick) r.held = [r.p[0], r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'power') {
      r.kick = 60;
      r.p = [-2.2, lerp(9.2, 7.25, ease(t / 40)), 0];
      r.anim = t < 40 ? 'run' : t < r.kick ? 'idle' : 'shoot';
      const hitT = t > 38;
      const q = Math.min(1, Math.max(0, (t - 38) / 20));
      r.defs.push({ who: 'a', p: [-2.2 + (hitT ? ease(q) * 0.3 : 0), 6.7 - (hitT ? ease(q) * 0.9 : 0), hitT ? Math.sin(q * Math.PI) * 0.36 : 0], anim: hitT ? 'dive' : 'idle', face: [r.p[0], r.p[1]] });
      if (t < r.kick) r.held = [r.p[0], r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'curve') {
      [[-0.85, 5.75], [0.05, 5.35]].forEach(([u, d], i) => r.defs.push({ who: 'a', id: 'c' + i, p: [u, d, 0], anim: 'idle', face: [-2.2, 7] }));
      r.anim = t < r.kick ? 'idle' : 'shoot';
      if (t < r.kick) r.held = [-2.0, 6.72, 0.05];
    } else if (st.kind === 'acrobat') {
      r.kick = 52;
      const jump = Math.sin(Math.min(1, t / 104) * Math.PI);
      r.p = [-2.2, 7.0, jump * 0.5];
      r.anim = t < 18 ? 'run' : t < 92 ? 'bicycle' : 'idle';
      if (t < r.kick) r.held = [-2.15, 6.85, r.p[2] + 0.5];
    } else {
      // passe enfiado: a barreira de marcadores e a fresta
      [[-1.35, 5.6], [0.2, 5.45], [0.95, 5.2]].forEach(([u, d], i) => r.defs.push({ who: 'a', id: 't' + i, p: [u, d, 0], anim: 'idle', face: [-2.2, 7] }));
      r.anim = t < r.kick ? 'idle' : 'shoot';
      if (t < r.kick) r.held = [-2.0, 6.72, 0.05];
    }
    r.from = [r.p[0] + 0.15, r.p[1] - 0.3, r.p[2] + (st.kind === 'acrobat' ? 0.45 : 0.06)];
    return r;
  }
  // a bola do passe: arco normal, curva por fora dos marcadores ou reta e forte
  function chemPath(o, r, aim, q) {
    const kind = o.st.kind;
    const p = mixP(r.from, aim, q);
    if (kind === 'curve') {
      p[2] += Math.sin(q * Math.PI) * 0.9 * (1 - q * 0.3);
      p[1] -= Math.sin(q * Math.PI) * 1.1;
    } else if (kind !== 'power' && kind !== 'through') p[2] += Math.sin(q * Math.PI) * 0.6;
    return p;
  }
  const CHEM_Y = [1.0, 4.0]; // onde você finaliza (u, d)
  const CHEM_HIT = 58;
  // segundo marcador (sem rosto de personagem famoso)
  const chemDef2 = (o) => o.def2 || (o.def2 = Object.assign({}, o.def, { name: 'Marcador', id: undefined, hairStyle: 'short_sharp', hairColor: '#3f2a1d', hairSecondary: '#3f2a1d', skinColor: '#e5b899', eyeStyle: undefined, mouth: undefined }));
  // o quadro duplo: o pé do parceiro solta a bola (na cor dele) e o seu recebe (no ciano)
  function chemPanels(ctx, S, o, kA, kB, q) {
    const { W, top, bot } = S;
    const ps = sockOf(o.partner, '#f8fafc');
    const ys = sockOf(o.you, '#22d3ee');
    if (kA > 0) {
      cutBoot(ctx, S, kA, q, {
        poly: [[24, top + 18], [W * 0.56, top + 18], [W * 0.44, bot - 18], [24, bot - 18]],
        from: [-60, 0],
        bg: '#e2e8f0',
        ink: rgba(o.pc, 0.75),
        radial: false,
        lineAng: 0.25,
        bx: 0.62,
        by: 0.5,
        f0: [0.2, 0.86],
        f1: [0.4, 0.62],
        a0: 0.9,
        a1: -0.35,
        ...ps
      });
    }
    if (kB > 0) {
      cutBoot(ctx, S, kB, q, {
        poly: [[W * 0.56 + 14, top + 18], [W - 24, top + 18], [W - 24, bot - 18], [W * 0.44 + 14, bot - 18]],
        from: [60, 0],
        bg: '#e2e8f0',
        ink: rgba(YOU, 0.8),
        radial: false,
        lineAng: Math.PI - 0.25,
        bx: 0.36,
        by: 0.46,
        f0: [0.82, 0.9],
        f1: [0.58, 0.66],
        a0: -0.9,
        a1: 0.3,
        flip: true,
        ball: q > 0.5,
        ...ys
      });
    }
  }

  CE.registerCine3D('chem_reaction', {
    phases: [110, 140, 100, 100],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    get title() {
      const c = CE.ptdChemCfg();
      return `⚗️ REAÇÃO QUÍMICA • ${String(c.partnerName || '').toUpperCase()} × ${String(c.youName || 'VOCÊ').toUpperCase()}`;
    },
    get tags() {
      const o = CE.ptdChemCtx();
      return ['PLANO 1 • SINTONIA', `PLANO 2 • ${o.chemName.toUpperCase()}`, 'PLANO 3 • UM SÓ CHUTE', 'PLANO 4 • RUMO AO GOL'];
    },
    get subs() {
      const o = CE.ptdChemCtx();
      const c = o.c;
      const sc = CE.CINE_READ_SCALE.chem_reaction ?? 1;
      const fits = (who, text, room) => (30 + `${who} ${text}`.length * 3.4) * sc <= room;
      const pWho = String(c.partnerName || '').toUpperCase();
      const quote = o.partner.quote ? `"${o.partner.quote}"` : '';
      const bonus = o.partner.chemBonus || '';
      return [
        [quote && fits(pWho, quote, 106) ? { from: 4, who: pWho, text: quote, color: o.pc } : { from: 2, who: 'NARRADOR', text: 'Os dois veem o mesmo lance!', color: NARR }],
        [{ from: 6, who: 'NARRADOR', text: bonus && fits('NARRADOR', bonus, 134) ? bonus : 'O passe sai no espaço perfeito.', color: NARR }],
        [{ from: CHEM_HIT + 4, who: 'NARRADOR', text: 'Um só chute!', color: NARR }],
        [{ from: 2, who: 'NARRADOR', text: 'O goleiro vai alcançar?', color: NARR }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.ptdChemCtx();
      const A = atk(false);
      const st = (K.st = {});
      const fin = o.st.finish || 'shoot';
      const P = (q) => pt(A, q[0], q[1], q[2] || 0);
      K.expo(1.0);
      act(K, CE.ptdChemKeeper(), pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
      if (phase === 0) {
        // SINTONIA: plano e contraplano — o parceiro com a bola e você, cada um olhando o mesmo ponto
        const r0 = chemPlay(o, 0);
        const pp = P(r0.p);
        const yp = pt(A, 3.4, 7.0);
        const spot = pt(A, CHEM_Y[0], CHEM_Y[1]);
        act(K, o.partner, pp, { id: 'p', face: spot, frame: 0 });
        act(K, o.you, yp, { id: 'y', face: spot, frame: 0 });
        if (r0.held) ball(K, P(r0.held));
        act(K, o.def, pt(A, -0.4, 4.4), { id: 'd', face: pt(A, -1, 9), frame: 0 });
        ring(K, pp, 0.36, o.pc, seg(t, 14, 26) * 0.8);
        ring(K, yp, 0.36, o.yc, seg(t, 60, 72) * 0.8);
        const second = t >= 56;
        const base = second ? yp : pp;
        const u = second ? t - 56 : t;
        const k = easeIO(u / 56);
        // (mesmo enquadramento dos dois lados: a câmera à frente e de lado, chegando devagar)
        const side = second ? -1 : 1;
        const e = [base[0] + side * lerp(1.55, 1.35, k), base[1] - lerp(2.0, 1.8, k), 0.42];
        cam(K, shake(K, e, f * 0.4, 0.004), [base[0] - side * 0.3, base[1] + 0.2, 0.44], 42);
      } else if (phase === 1) {
        // A JOGADA: a grua atrás do lance; câmera lenta no passe; depois segue a bola até você
        const K0 = chemPlay(o, 0).kick;
        const ta = remap(t, [[0, 0], [K0 - 12, K0 - 12], [K0 + 26, K0 + 2], [140, 140 - 24]]);
        const r = chemPlay(o, ta);
        const aim = [CHEM_Y[0], CHEM_Y[1], FIN_Z[fin]];
        act(K, o.partner, P(r.p), { id: 'p', face: r.anim === 'shoot' ? P(aim) : pt(A, r.p[0], 0), anim: r.anim });
        r.defs.forEach((d, i) => act(K, d.who === 'b' ? chemDef2(o) : o.def, P(d.p), { id: 'd' + i + (d.id || ''), face: P(d.face), anim: d.anim, frame: d.anim === 'idle' ? 0 : undefined }));
        const yk = ease(ta / 116);
        const yp = pt(A, lerp(3.6, CHEM_Y[0] + 0.35, yk), lerp(6.8, CHEM_Y[1] + 0.25, yk));
        act(K, o.you, yp, { id: 'y', face: P(r.from), anim: 'run' });
        let bp = null;
        if (ta >= r.kick) bp = chemPath(o, r, aim, Math.min(1, (ta - r.kick) / 56));
        else if (r.held) bp = r.held;
        if (bp) ball(K, P(bp));
        if (r.rings) groundHit(K, P(r.rings), ta - 34, o.pc, 8, 9);
        const k = easeIO(t / 140);
        const follow = ease(seg(ta, r.kick, r.kick + 40));
        const look = mixP(P([r.p[0] + 0.3, r.p[1] - 0.6, 0.35]), pt(A, CHEM_Y[0] - 0.2, CHEM_Y[1] + 0.8, 0.35), follow);
        cam(K, shake(K, mixP(pt(A, -0.2, 12.3, 0.8), pt(A, 1.2, 9.6, 1.55), k), f * 0.5, o.st.kind === 'sprint' ? 0.014 : 0.006), look, 46);
        st.ball = bp ? wp(P(bp)) : null;
        st.slow = seg(t, K0 - 12, K0 - 2) * (1 - seg(t, K0 + 20, K0 + 30));
        st.kicked = ta >= r.kick;
      } else if (phase === 2) {
        // UM SÓ CHUTE: de lado e baixo — a bola chega e você bate de primeira
        const air = FIN_AIR[fin];
        const hit = t >= CHEM_HIT;
        const yz = fin === 'bicycle' ? Math.sin(seg(t, CHEM_HIT - 26, CHEM_HIT + 30) * Math.PI) * 0.42 : fin === 'volley' ? Math.sin(seg(t, CHEM_HIT - 20, CHEM_HIT + 24) * Math.PI) * 0.16 : 0;
        const yp = pt(A, CHEM_Y[0], CHEM_Y[1], yz);
        const anim = t < CHEM_HIT - 14 ? 'run' : !hit ? (fin === 'bicycle' ? 'bicycle' : 'windup') : fin === 'bicycle' ? 'bicycle' : 'shoot';
        act(K, o.you, yp, { id: 'y', face: pt(A, 0.4, 0), anim, frame: anim === 'run' ? undefined : 1, opts: anim === 'bicycle' ? { animTime: 20 } : undefined });
        act(K, o.def, pt(A, -0.7, 1.7), { id: 'd', face: yp, frame: 0 });
        const foot = pt(A, CHEM_Y[0] - 0.16, CHEM_Y[1] - 0.3, FIN_Z[fin] + yz * 0.6);
        const goal = pt(A, 0.3, 0.3, 0.82);
        const bp = !hit ? mixP(pt(A, -1.6, 6.2, 0.9 + air), foot, ease(t / CHEM_HIT)) : mixP(foot, goal, easeIn(seg(t, CHEM_HIT + 1, CHEM_HIT + 40)));
        ball(K, bp);
        groundHit(K, pt(A, CHEM_Y[0] - 0.16, CHEM_Y[1] - 0.3), t - CHEM_HIT, '#e0f2fe', fin === 'shoot' ? 14 : 0, 11);
        const k = easeIO(seg(t, 0, CHEM_HIT));
        const e = pt(A, CHEM_Y[0] + lerp(1.8, 1.55, k), CHEM_Y[1] - lerp(0.7, 0.95, k), 0.22 + air * 0.5);
        cam(K, shake(K, e, f * 2, hit ? 0.03 * Math.max(0, 1 - (t - CHEM_HIT) / 24) : 0.003, 6), pt(A, CHEM_Y[0] - 0.1, CHEM_Y[1] - 0.1, 0.38 + air * 0.6), 42);
        st.foot = wp(foot);
        st.ball = wp(bp);
      } else {
        // RUMO AO GOL: a câmera atrás da bola; o goleiro começa o pulo (o resultado é da partida)
        const z = easeIO(t / 100) * 0.86;
        const bp = (q) => pt(A, lerp(0.9, 0.62, q), lerp(3.4, 0.4, q), lerp(0.42, 0.84, q));
        const b = bp(z);
        ball(K, b);
        const reach = seg(t, 56, 100);
        act(K, CE.ptdChemKeeper(), pt(A, lerp(-0.05, 0.42, ease(reach)), 0.45, Math.sin(reach * Math.PI * 0.8) * 0.3), { id: 'gk', face: pt(A, 0, 9), anim: reach > 0.1 ? 'dive' : 'idle', frame: reach > 0.1 ? undefined : 0, opts: reach > 0.1 ? { animTime: reach * 30 } : undefined });
        act(K, o.def, pt(A, -0.9, 1.9), { id: 'd', face: b, frame: 0 });
        const e = [b[0] + 0.24, b[1] + 1.5, b[2] + 0.28];
        cam(K, shake(K, e, f, 0.01, 7), pt(A, 0.32, -0.2, 0.6), 48);
        st.ball = wp(b);
        st.b1 = wp(bp(Math.max(0, z - 0.06)));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase } = S;
      const o = CE.ptdChemCtx();
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        flares(ctx, K, S, 0.5);
        // os dois quadros lado a lado: o pé do parceiro (na cor dele) e o seu (no ciano)
        if (t > 72) chemPanels(ctx, S, o, seg(t, 72, 80), seg(t, 84, 92), seg(t, 72, 110));
        CE.cineSfx(S, 72, 'sync', () => window.SFX?.jingle?.([659, 988], 0, 'triangle'));
      } else if (phase === 1) {
        if (o.st.kind === 'sprint') CE.drawSpeedLines(ctx, W, H, rgba(o.pc, 1), 0.08);
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.2 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        if (st.kicked && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 34, rgba(o.pc, 0.6));
        CE.cineSfx(S, chemPlay(o, 0).kick, 'pass', () => window.SFX?.pass?.());
      } else if (phase === 2) {
        const fp = st.foot || { x: W * 0.45, y: H * 0.7 };
        if (t < CHEM_HIT && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 40, rgba(o.pc, 0.55));
        if (t >= CHEM_HIT && t < CHEM_HIT + 2) impactFrame(ctx, W, H);
        if (t >= CHEM_HIT) {
          CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, CHEM_HIT + 1, CHEM_HIT + 8)));
          if (t < CHEM_HIT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - CHEM_HIT) / 8));
          if (st.ball) {
            CE.luckStreak(ctx, fp.x, fp.y - 4, st.ball.x, st.ball.y - 4, 3, 18, rgbOf(o.pc).join(','), 0.75);
            CE.luckStreak(ctx, fp.x, fp.y + 4, st.ball.x, st.ball.y + 4, 3, 18, rgbOf(o.yc).join(','), 0.75);
          }
          hitWord(ctx, 'DOM!!', W * 0.74, S.top + 120, 110, seg(t, CHEM_HIT, CHEM_HIT + 6), t - CHEM_HIT, W * 0.4, -0.1);
        }
        CE.cineSfx(S, CHEM_HIT, 'kick', () => window.SFX?.kick?.(1));
      } else {
        CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.18);
        if (st.ball && st.b1) {
          CE.luckStreak(ctx, st.b1.x - 5, st.b1.y, st.ball.x - 5, st.ball.y, 3, 22, rgbOf(o.pc).join(','), 0.6);
          CE.luckStreak(ctx, st.b1.x + 5, st.b1.y, st.ball.x + 5, st.ball.y, 3, 22, rgbOf(o.yc).join(','), 0.6);
        }
        CE.cineSfx(S, 2, 'fly', () => window.SFX?.whoosh?.());
      }
    }
  });

  // =========================================================================
  // 3) 1ª SELEÇÃO: O DESPERTAR (first_selection_awakening)
  // O Bachira dá o elástico no Reo e cruza → o tempo quase para (sem cor), visto do alto: a
  // fresta entre o Nagi e o Reo e o quadro da última peça se encaixando → o voleio sem
  // dominar (quadro de impacto, a cor volta) → a bola passa pelo carrinho do Nagi → a rede e
  // a comemoração (o Ego fala).
  // =========================================================================
  const FUT = [1.6, 3.55]; // o ponto futuro (u, d): a fresta entre o Nagi e o Reo
  const FSA_KICK = [1.85, 3.95]; // onde você bate de voleio
  const FSA_HIT = 52;
  // a bola do cruzamento até o seu pé (q 0..1)
  const fsaCross = (A, from, q) => {
    const to = pt(A, FSA_KICK[0] - 0.15, FSA_KICK[1] - 0.3, 0.36);
    const p = mixP(from, to, q);
    p[2] += Math.sin(q * Math.PI) * 1.5;
    return p;
  };
  const fsaFrom = (A) => pt(A, -2.23, 5.7, 0.05);
  // o tempo do cruzamento em cada plano: plano 1 até 0,42; plano 2 quase parado; plano 3 cai
  const fsaGoalFly = (A, q) => pt(A, lerp(FSA_KICK[0] - 0.15, 0.68, q), lerp(FSA_KICK[1] - 0.3, -0.12, q), lerp(0.36, 0.82, Math.sin(clamp(q) * Math.PI * 0.5)));

  CE.registerCine3D('first_selection_awakening', {
    phases: [110, 120, 100, 90, 140],
    music: 'epic',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    theme: 'bluelock_bunker',
    title: '🧩 1ª SELEÇÃO • O DESPERTAR',
    tags: ['PLANO 1 • O CRUZAMENTO DO BACHIRA', 'PLANO 2 • A ÚLTIMA PEÇA', 'PLANO 3 • O VOLEIO', 'PLANO 4 • NEM O NAGI', 'PLANO 5 • A REDE DO TIME V'],
    get subs() {
      return [
        [{ from: 60, who: 'MEGURU BACHIRA', text: '"É você!!"', color: '#facc15' }],
        [{ from: 34, who: 'VOCÊ', text: '(A última peça... sou EU.)', color: YOU }],
        [{ from: 20, who: 'NARRADOR', text: 'Voleio sem dominar!', color: NARR }],
        [{ from: 8, who: 'NARRADOR', text: 'Nem o Nagi!', color: NARR }],
        [{ from: 70, who: 'JINPACHI EGO', text: '"Isso! Esse é o EGO."', color: YOU }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const c = CE.ptdFirstCast();
      const A = atk(false);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase === 0) {
        // O CRUZAMENTO: a grua atrás do lance; câmera lenta no elástico; depois sobe com a bola
        const a = remap(t, [[0, 0], [20, 20], [52, 34], [110, 92]]);
        const el = a >= 22 && a < 40;
        const cross = 62;
        const bu = a < 40 ? lerp(-3.5, -2.7, ease(a / 30)) : lerp(-2.7, -2.35, ease(seg(a, 40, 60)));
        const bd = a < 40 ? lerp(9.4, 7.2, ease(a / 30)) : lerp(7.2, 6.0, ease(seg(a, 40, 60)));
        const bp = pt(A, bu, bd);
        act(K, c.bachira, bp, { id: 'b', face: a >= cross ? pt(A, FUT[0], FUT[1]) : pt(A, bu + 0.3, 0), anim: a >= cross ? 'shoot' : el ? 'rabona' : 'run' });
        const rk = ease(seg(a, 30, 48));
        act(K, c.reo, pt(A, lerp(-2.25, -2.45, seg(a, 0, 28)) - rk * 0.7, 6.75 + rk * 0.25, rk > 0 ? Math.sin(rk * Math.PI) * 0.12 : 0), { id: 'r', face: rk > 0 ? pt(A, -6, 6.9) : bp, anim: a > 30 ? 'dive' : 'idle', frame: a > 30 ? undefined : 0 });
        act(K, c.nagi, pt(A, 0.75, 2.85), { id: 'n', face: bp, frame: 0 });
        act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        const yk = a / 110;
        act(K, c.you, pt(A, lerp(3.0, 2.55, yk), lerp(7.4, 5.9, yk)), { id: 'y', face: pt(A, FUT[0], FUT[1]), anim: 'run' });
        let ballP;
        if (a < cross) {
          const wig = el ? Math.sin((a - 24) * 0.5) * 0.18 : 0;
          ballP = pt(A, bu + 0.12 + wig, bd - 0.32, 0.05);
        } else ballP = fsaCross(A, fsaFrom(A), seg(a, cross, cross + 72) * 0.92);
        ball(K, ballP);
        const k = easeIO(t / 110);
        const up = ease(seg(a, cross, 92));
        const look = mixP(pt(A, bu + 0.4, bd - 0.8, 0.35), mixP(pt(A, 0.4, 4.6, 0.6), ballP, 0.5), up);
        cam(K, shake(K, mixP(pt(A, -1.6, 11.0, 0.8), pt(A, -0.4, 10.0, 1.8), k), f * 0.5, 0.006), look, lerp(44, 50, up));
        st.slow = seg(t, 20, 26) * (1 - seg(t, 48, 56));
      } else if (phase === 1) {
        // A ÚLTIMA PEÇA: o tempo quase para. Do alto: a fresta atrás do Nagi acende no gramado;
        // só você se mexe, devagar, até ela (o Reo ficou no chão lá na ponta)
        const look = pt(A, -2, 7);
        act(K, c.nagi, pt(A, 0.75, 2.85), { id: 'n', face: look, frame: 0 });
        act(K, c.reo, pt(A, -3.05, 7.0), { id: 'r', face: look, anim: 'sit_floor' });
        act(K, c.keeper, pt(A, 0.1, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        act(K, c.bachira, pt(A, -2.35, 6.0), { id: 'b', face: pt(A, FUT[0], FUT[1]), anim: 'shoot', frame: 1 });
        const k = easeIO(t / 120);
        const yp = pt(A, lerp(2.55, FSA_KICK[0] + 0.1, k), lerp(5.9, FSA_KICK[1] + 0.35, k));
        act(K, c.you, yp, { id: 'y', face: pt(A, FUT[0], FUT[1]), anim: 'run', frame: Math.floor(t * 0.35) });
        const bp = fsaCross(A, fsaFrom(A), lerp(0.4, 0.5, t / 120));
        ball(K, bp);
        ring(K, pt(A, FUT[0], FUT[1]), 0.36 + Math.sin(t * 0.18) * 0.02, YOU, seg(t, 24, 40));
        // a câmera do alto (uns 40°), girando devagar em volta da área
        const ang = lerp(-0.42, -0.1, k);
        const ctr = pt(A, 1.5, 4.3);
        const R = 4.6;
        cam(K, [ctr[0] + Math.sin(ang) * R, ctr[1] + Math.cos(ang) * R, lerp(3.2, 2.9, k)], pt(A, 1.45, 4.0, 0.3), 50);
        st.ball = wp(bp);
        st.gap = wp(pt(A, FUT[0], FUT[1], 0.05));
      } else if (phase === 2) {
        // O VOLEIO: de lado, rente ao chão; a bola cai e você bate sem deixar quicar
        const hit = t >= FSA_HIT;
        const yp = pt(A, FSA_KICK[0], FSA_KICK[1], hit ? 0 : Math.sin(seg(t, FSA_HIT - 24, FSA_HIT + 20) * Math.PI) * 0.1);
        act(K, c.you, yp, { id: 'y', face: pt(A, 0.4, 0), anim: t < FSA_HIT - 18 ? 'run' : hit ? 'shoot' : 'windup', frame: t < FSA_HIT - 18 ? undefined : 1 });
        act(K, c.nagi, pt(A, 0.75, 2.85), { id: 'n', face: yp, frame: 0 });
        const u = Math.max(0, t - FSA_HIT);
        const bp = !hit ? fsaCross(A, fsaFrom(A), lerp(0.5, 1, easeIn(t / FSA_HIT))) : fsaGoalFly(A, easeIn(seg(u, 0, 36)));
        ball(K, bp);
        const push = easeIO(seg(t, 0, FSA_HIT));
        const pan = ease(seg(u, 8, 44)) * 0.35;
        const look = mixP(pt(A, FSA_KICK[0] - 0.1, FSA_KICK[1] - 0.2, 0.46), pt(A, 0.8, 1.4, 0.6), pan);
        cam(K, shake(K, pt(A, FSA_KICK[0] + lerp(2.35, 2.1, push), FSA_KICK[1] - 0.15, 0.28), f * 2, hit ? 0.03 * Math.max(0, 1 - u / 26) : 0.003, 3), look, lerp(44, 40, push));
        st.foot = wp(pt(A, FSA_KICK[0] - 0.15, FSA_KICK[1] - 0.3, 0.36));
        st.ball = wp(bp);
      } else if (phase === 3) {
        // NEM O NAGI: de lado — o Nagi se joga no carrinho e a bola passa por cima da ponta
        // da chuteira dele (câmera lenta); a câmera vira e o goleiro voa e não alcança
        const a = remap(t, [[0, 0], [22, 22], [56, 32], [90, 66]]);
        const q = clamp(lerp(0.08, 0.98, a / 66));
        const bp = fsaGoalFly(A, q);
        ball(K, bp);
        const nk = ease(seg(a, 4, 28));
        act(K, c.nagi, pt(A, lerp(1.0, 1.3, nk), lerp(1.75, 2.75, nk)), { id: 'n', face: pt(A, 1.5, 9), anim: nk > 0.15 ? 'slide' : 'run' });
        const gk = seg(q, 0.72, 0.98);
        act(K, c.keeper, pt(A, lerp(0.1, 0.62, ease(gk)), 0.5, Math.sin(gk * Math.PI) * 0.34), { id: 'gk', face: pt(A, 5, 0.5), anim: gk > 0.05 ? 'dive' : 'idle', opts: gk > 0.05 ? { animTime: gk * 30 } : undefined });
        const pan = easeIO(seg(a, 30, 60));
        cam(K, shake(K, pt(A, lerp(3.75, 3.9, pan), lerp(2.6, 2.25, pan), 0.3), f, 0.006, 9), mixP(pt(A, 1.2, 2.5, 0.45), pt(A, 0.9, 1.2, 0.6), pan), 46);
        st.ball = wp(bp);
        st.b1 = wp(fsaGoalFly(A, Math.max(0, q - 0.07)));
        st.slow = seg(t, 22, 28) * (1 - seg(t, 50, 58));
      } else {
        const HIT = 22;
        if (t < 64) {
          // A REDE: de dentro do gol
          netShot(K, S, A, t, { cu: 0.7, cz: 0.8, from: [0.95, 2.6, 0.75], hit: HIT, keeper: c.keeper });
          act(K, c.nagi, pt(A, 1.3, 2.75), { id: 'n', face: pt(A, 0.6, 0), anim: 'slide', opts: { animTime: 99 } });
          act(K, c.you, pt(A, FSA_KICK[0], FSA_KICK[1]), { id: 'y', face: pt(A, 0.4, 0), anim: 'shoot', frame: 1 });
        } else {
          // a comemoração: você de braços abertos, o Bachira correndo até você; a grua sobe
          const u = t - 64;
          const k = easeIO(u / 76);
          const yp = pt(A, 1.4, 3.1);
          act(K, c.you, yp, { id: 'y', face: pt(A, 1.4, 0), anim: 'celebrate' });
          act(K, c.bachira, pt(A, lerp(-0.6, 0.8, ease(u / 60)), lerp(5.6, 3.7, ease(u / 60))), { id: 'b', face: yp, anim: u < 58 ? 'run' : 'celebrate' });
          act(K, c.nagi, pt(A, 0.1, 4.7), { id: 'n', face: yp, frame: 0 });
          act(K, c.keeper, pt(A, 0.4, 0.6), { id: 'gk', face: pt(A, 0, 9), anim: 'kneel_one' });
          cam(K, mixP(pt(A, 1.6, 0.95, 0.36), pt(A, 1.2, 0.7, 2.2), k), mixP(pt(A, 1.4, 3.1, 0.62), pt(A, 1.2, 5.6, 0.3), k), lerp(44, 56, k));
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const c = CE.ptdFirstCast();
      const st = resolve(K, K.st || {});
      const scoreBefore = () => CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: Math.max(0, c.score.hs - 1) }));
      if (phase === 0) {
        flares(ctx, K, S, 0.6);
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.2 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 80, 'cross', () => window.SFX?.kick?.(0.6));
        CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: Math.max(0, c.score.hs - 1), k: seg(t, 4, 16) }));
      } else if (phase === 1) {
        // sem cor (o tempo quase parado); a fresta acesa e o quadro da peça se encaixando
        bwBlue(ctx, W, H, ease(seg(t, 0, 20)));
        if (st.gap) CE.cineGlow(ctx, st.gap.x, st.gap.y, 60, 'rgba(0,245,212,0.5)', seg(t, 24, 40));
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 36, 'rgba(255,255,255,0.45)', 0.9);
        if (t > 54) {
          const CA = CE.ART;
          const kIn = seg(t, 54, 62);
          const q = seg(t, 58, 108);
          if (CA)
            CA.panel(
              ctx,
              [[W * 0.52, top + 22], [W - 22, top + 14], [W - 22, bot - 22], [W * 0.46, bot - 30]],
              (b, g) => {
                g.fillStyle = '#0b1430';
                g.fillRect(b.x, b.y, b.w, b.h);
                const s = b.h * 0.26;
                const cx = b.x + b.w * 0.55;
                const cy = b.y + b.h * 0.52;
                CA.speedRadial(g, cx, cy, W, H, { color: q > 0.72 ? 'rgba(204,251,241,0.55)' : 'rgba(56,189,248,0.18)', inner: s * 0.9, n: 50, thick: 1.4 });
                for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i || j) puzzlePiece(g, cx + i * s, cy + j * s, s * 0.96, j === 1 && i === -1 ? '#334155' : '#1e3a5f', '#0b1020');
                // a peça que faltava entra pela direita e encaixa
                const e = ease(seg(q, 0, 0.72));
                const px = lerp(cx + b.w * 0.55, cx, e);
                const py = lerp(cy - b.h * 0.55, cy, e);
                if (q > 0.72) CA.burst(g, cx, cy, s * 1.05 * ease(seg(q, 0.72, 0.9)), { fill: '#ccfbf1', stroke: '#0b1020', lw: 10, n: 14 });
                puzzlePiece(g, px, py, s * 0.96, '#00f5d4', '#0b1020');
              },
              { k: kIn, from: [70, -30], pixel: PIX }
            );
        }
        CE.cineSfx(S, 100, 'click', () => window.SFX?.blip?.(1320));
        scoreBefore();
      } else if (phase === 2) {
        const fp = st.foot || { x: W * 0.45, y: H * 0.6 };
        const KT = FSA_HIT;
        if (t < KT) bwBlue(ctx, W, H, 1);
        else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, KT, KT + 16)) * W * 1.4 });
        if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
        if (t >= KT) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
          if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
          if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 4, 26, '0,245,212', 0.85 * (1 - seg(t, KT + 26, KT + 46)));
          hitWord(ctx, 'DOM!!', W * 0.26, top + 120, 110, seg(t, KT, KT + 6), t - KT, W * 0.4, -0.1);
        } else if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 40, 'rgba(255,255,255,0.45)', 0.9);
        // antes do voleio: o quadro da sua chuteira indo na bola (sem cor, só o seu ciano)
        if (t > 22 && t < KT)
          cutBoot(ctx, S, seg(t, 22, 30), seg(t, 22, KT), {
            poly: [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]],
            from: [0, 50],
            glow: 'rgba(0,245,212,0.35)',
            burst: 0.84,
            bx: 0.62,
            by: 0.36,
            f0: [0.2, 0.9],
            f1: [0.48, 0.6]
          });
        CE.cineSfx(S, KT, 'chute', () => window.SFX?.kick?.(1));
        scoreBefore();
      } else if (phase === 3) {
        CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.2);
        if (st.ball && st.b1) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 3, 22, '0,245,212', 0.7);
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.2 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 2, 'fly', () => window.SFX?.whoosh?.());
        scoreBefore();
      } else {
        const HIT = 22;
        if (t < 64) {
          netShotOverlay(ctx, S, st);
          scoreBefore();
        } else {
          flares(ctx, K, S, 0.9);
          confetti(ctx, S, t, 0.8);
          CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { pop: 'home', popK: seg(t, 64, 80) }));
        }
        CE.cineSfx(S, HIT, 'net', () => window.SFX?.goal?.(true));
      }
    }
  });

  // =========================================================================
  // 4) NEL: METAVISION (nel_metavision_goal)
  // O Metavision visto do alto (sem cor, uma onda de leitura sai de você e marca cada um
  // no gramado) → o passe do Hiori, o Kaiser e o Lorenzo saltam na canhota e você finta no
  // ar (câmera lenta) → a bomba de direita (quadro de impacto) → a curva atrás do Kaiser →
  // a rede e o telão da BLTV com o leilão.
  // =========================================================================
  const META = [
    { key: 'hiori', p: [-2.8, 9.9], col: YOU },
    { key: 'kaiser', p: [-1.1, 4.2], col: '#ef4444' },
    { key: 'lorenzo', p: [2.0, 3.2], col: '#ef4444' },
    { key: 'keeper', p: [0, 0.5], col: '#ef4444' },
    { key: 'lorenzo', id: 'f1', p: [3.9, 5.4], col: '#ef4444' },
    { key: 'hiori', id: 'm1', p: [3.1, 8.3], col: YOU },
    { key: 'kaiser', id: 'f2', p: [-2.8, 2.2], col: '#ef4444' }
  ];
  const ME_AT = [0.7, 6.4];
  const NEL_AT = [0.7, 4.6]; // onde você recebe e chuta (no ar)
  const NEL_HIT = 16;
  // figurantes (sem rosto de personagem famoso) para os dois sem nome de cada time
  const extraOf = (c, base, id) => {
    const cache = c._ex || (c._ex = {});
    if (!cache[id]) cache[id] = Object.assign({}, base, { name: 'Jogador ' + id, id: undefined, hairStyle: 'short_sharp', hairColor: id === 'm1' ? '#78350f' : '#1f2937', hairSecondary: id === 'm1' ? '#78350f' : '#1f2937', skinColor: '#e8c4a8', eyeStyle: undefined, mouth: undefined });
    return cache[id];
  };
  // a curva impossível (efeito Magnus) da bomba de direita
  const nelCurve = (A, q) => {
    const p = mixP(pt(A, NEL_AT[0] - 0.05, NEL_AT[1] - 0.3, 0.55), pt(A, -0.78, -0.15, 0.84), q);
    p[0] += Math.sin(q * Math.PI) * 1.5 * A.sx;
    p[2] += Math.sin(q * Math.PI) * 0.4;
    return p;
  };
  // o telão da BLTV: placa em pixel (texto em fonte de pixel), redesenhada quando o valor muda
  let BLTV = null;
  const bltvCv = (val, name) => {
    const key = val + '|' + name;
    if (BLTV && BLTV.key === key) return BLTV;
    const cv = BLTV || document.createElement('canvas');
    cv.width = 128;
    cv.height = 72;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#070b18';
    g.fillRect(0, 0, 128, 72);
    g.fillStyle = '#eab308';
    g.fillRect(0, 0, 128, 12);
    g.fillRect(0, 70, 128, 2);
    CE.finPixelText(g, 'BLTV  LEILÃO', 64, 6.5, 1, '#0b1020');
    CE.finPixelText(g, String(name || '').toUpperCase().slice(0, 16), 64, 26, 1, '#e2e8f0', 'center', 120);
    CE.finPixelText(g, `¥ ${val.toLocaleString('pt-BR')}`, 64, 46, 1, val >= 300000000 ? '#facc15' : '#fde68a', 'center', 122);
    g.fillStyle = '#dc2626';
    g.fillRect(4, 60, 4, 4);
    CE.finPixelText(g, 'AO VIVO', 12, 62, 1, '#94a3b8', 'left');
    cv.key = key;
    cv.fresh = true;
    BLTV = cv;
    return cv;
  };

  CE.registerCine3D('nel_metavision_goal', {
    phases: [110, 110, 90, 100, 160],
    music: 'epic',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    theme: 'nel_dome',
    title: '👁️ NEL • METAVISION',
    tags: ['PLANO 1 • METAVISION', 'PLANO 2 • A FINTA NO AR', 'PLANO 3 • DUAS ARMAS', 'PLANO 4 • EFEITO MAGNUS', 'PLANO 5 • ¥ 300.000.000'],
    get subs() {
      return [
        [{ from: 10, who: 'VOCÊ', text: '(Eu já vi esse lance.)', color: YOU }],
        [{ from: 6, who: 'VOCÊ', text: '(Vão bloquear a canhota.)', color: YOU }],
        [{ from: NEL_HIT + 6, who: 'NARRADOR', text: 'Bomba de direita!', color: NARR }],
        [{ from: 30, who: 'MICHAEL KAISER', text: '"Impossível."', color: '#a855f7' }],
        [{ from: 90, who: 'BLTV', text: 'Seu leilão: ¥ 300.000.000!', color: '#facc15' }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const c = CE.ptdNelCast();
      const A = atk(false);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase === 0) {
        // METAVISION: do alto, a câmera gira devagar em volta de você; todo mundo parado
        const me = pt(A, ME_AT[0], ME_AT[1]);
        act(K, c.you, me, { id: 'y', face: pt(A, 0.7, 0), frame: 0 });
        const R0 = t * 0.11; // a onda de leitura (raio em ladrilhos)
        st.pl = META.map((m, i) => {
          const who = m.id ? extraOf(c, c[m.key], m.id) : c[m.key];
          const p = pt(A, m.p[0], m.p[1]);
          act(K, who, p, { id: m.id || m.key, face: m.col === YOU ? pt(A, 0, 0) : me, frame: 0 });
          const d = Math.hypot(p[0] - me[0], p[1] - me[1]);
          const lit = seg(R0, d, d + 0.8);
          ring(K, p, 0.32, m.col, lit);
          return { s: wp([p[0], p[1], 1.0]), lit, col: m.col, i };
        });
        if (R0 < 12) K.floor({ x0: me[0] - R0, y0: me[1] - R0, x1: me[0] + R0, y1: me[1] + R0, z: 0.012, img: waveCv(), color: '#7dd3fc', alpha: 0.75 * (1 - seg(R0, 7, 12)), em: true });
        // a rota de gol: tracejado de você até o canto (aparece no fim)
        const rk = seg(t, 70, 96);
        for (let i = 0; i < 9; i++) {
          const a0 = i / 9;
          const a1 = a0 + 0.06;
          if (a0 > rk) break;
          const p0 = mixP(me, pt(A, -0.75, -0.05), a0);
          const p1 = mixP(me, pt(A, -0.75, -0.05), Math.min(a1, rk));
          floorLine(K, p0, p1, 0.07, '#facc15', 0.9);
        }
        const k = easeIO(t / 110);
        const ang = lerp(0.42, -0.2, k);
        const ctr = pt(A, 0.3, 5.0);
        cam(K, [ctr[0] + Math.sin(ang) * 5.4, ctr[1] + Math.cos(ang) * 5.4, lerp(3.6, 3.3, k)], pt(A, 0.3, 4.7, 0), 50);
        st.me = wp([me[0], me[1], 1.0]);
      } else if (phase === 1) {
        // A FINTA: o passe do Hiori; você sobe para receber; o Kaiser e o Lorenzo saltam na
        // sua canhota — câmera lenta na finta
        const a = remap(t, [[0, 0], [40, 40], [96, 52], [110, 64]]);
        const jump = Math.sin(clamp((a - 30) / 60) * Math.PI) * 0.36;
        const yp = pt(A, NEL_AT[0], NEL_AT[1], Math.max(0, jump));
        act(K, c.you, yp, { id: 'y', face: pt(A, 0.7, 0), anim: a < 30 ? 'run' : 'windup', frame: a < 30 ? undefined : 1 });
        const kz = ease(seg(a, 18, 48));
        act(K, c.lorenzo, pt(A, 0.85, lerp(2.4, 3.7, kz)), { id: 'l', face: yp, anim: a > 24 ? 'slide' : 'run' });
        act(K, c.kaiser, pt(A, 0.45, lerp(2.6, 3.85, kz), Math.sin(kz * Math.PI) * 0.4), { id: 'k', face: yp, anim: a > 24 ? 'jump' : 'run', opts: a > 24 ? { animTime: kz * 40 } : undefined });
        act(K, c.hiori, pt(A, -2.6, 7.2), { id: 'h', face: yp, anim: a < 6 ? 'shoot' : 'idle', frame: a < 6 ? 1 : 0 });
        act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        const bk = seg(a, 0, 52);
        const bp = mixP(pt(A, -2.4, 6.9, 0.05), pt(A, NEL_AT[0] - 0.05, NEL_AT[1] - 0.3, 0.55), bk);
        bp[2] += Math.sin(bk * Math.PI) * 0.9;
        ball(K, bp);
        const k = easeIO(t / 110);
        cam(K, shake(K, pt(A, lerp(2.9, 2.5, k), lerp(2.6, 2.9, k), lerp(0.3, 0.38, k)), f * 0.5, 0.005), pt(A, NEL_AT[0] - 0.1, NEL_AT[1] - 0.4, 0.55), lerp(48, 42, k));
        st.slow = seg(t, 40, 48) * (1 - seg(t, 98, 110));
      } else if (phase === 2) {
        // DUAS ARMAS: de lado — a bomba de direita no ar, por cima dos dois
        const hit = t >= NEL_HIT;
        const yp = pt(A, NEL_AT[0], NEL_AT[1], hit ? Math.max(0, 0.36 - (t - NEL_HIT) * 0.008) : 0.36);
        act(K, c.you, yp, { id: 'y', face: pt(A, 0.7, 0), anim: hit ? 'shoot' : 'windup', frame: 1 });
        act(K, c.lorenzo, pt(A, 0.85, 3.75 + seg(t, 0, 90) * 0.3), { id: 'l', face: yp, anim: 'slide', opts: { animTime: 99 } });
        act(K, c.kaiser, pt(A, 0.45, 3.9 - seg(t, 0, 60) * 0.2, Math.max(0, 0.38 - t * 0.008)), { id: 'k', face: yp, anim: 'jump', opts: { animTime: 30 } });
        const u = Math.max(0, t - NEL_HIT);
        const bp = hit ? nelCurve(A, easeIn(seg(u, 0, 50)) * 0.4) : pt(A, NEL_AT[0] - 0.05, NEL_AT[1] - 0.3, 0.55);
        ball(K, bp);
        const pan = ease(seg(u, 6, 40)) * 0.4;
        cam(K, shake(K, pt(A, NEL_AT[0] - 2.7 + pan * 0.2, NEL_AT[1] + 0.25 + pan * 0.3, 0.42), f * 2, hit ? 0.03 * Math.max(0, 1 - u / 26) : 0.003, 3), mixP(pt(A, NEL_AT[0], NEL_AT[1] - 0.2, 0.6), pt(A, 0.6, 2.0, 0.7), pan), 42 + pan * 8);
        st.foot = wp(pt(A, NEL_AT[0] - 0.05, NEL_AT[1] - 0.3, 0.55));
        st.ball = wp(bp);
      } else if (phase === 3) {
        // EFEITO MAGNUS: o Kaiser parado no meio do quadro; a bola faz a curva atrás dele
        const a = remap(t, [[0, 0], [30, 30], [70, 42], [100, 70]]);
        const kp = pt(A, -0.55, 3.3);
        act(K, c.kaiser, kp, { id: 'k', face: pt(A, lerp(0.6, -1.4, seg(a, 20, 60)), lerp(8, 1, seg(a, 20, 60))), frame: 0 });
        const q = lerp(0.4, 1.0, seg(a, 0, 70));
        const gk = seg(q, 0.7, 1.0);
        act(K, c.keeper, pt(A, lerp(0, -0.45, ease(gk)), 0.5, Math.sin(gk * Math.PI) * 0.3), { id: 'gk', face: pt(A, -5, 0.5), anim: gk > 0.05 ? 'dive' : 'idle', opts: gk > 0.05 ? { animTime: gk * 30 } : undefined });
        const bp = nelCurve(A, q);
        ball(K, bp);
        const k = easeIO(t / 100);
        cam(K, shake(K, pt(A, lerp(0.35, 0.15, k), lerp(6.1, 5.85, k), 0.62), f * 0.4, 0.004), pt(A, -0.4, 2.2, 0.55), lerp(46, 42, k));
        st.ball = wp(bp);
        st.b1 = wp(nelCurve(A, Math.max(0.4, q - 0.05)));
        st.b2 = wp(nelCurve(A, Math.max(0.4, q - 0.1)));
        st.slow = seg(t, 30, 38) * (1 - seg(t, 64, 72));
      } else {
        const HIT = 18;
        if (t < 60) {
          // A REDE: de dentro do gol (o canto esquerdo)
          netShot(K, S, A, t, { cu: -0.7, cz: 0.8, from: [-0.1, 2.4, 0.95], hit: HIT, keeper: c.keeper });
          act(K, c.kaiser, pt(A, -0.55, 3.3), { id: 'k', face: pt(A, -0.6, 0), frame: 0 });
        } else {
          // O LEILÃO: você comemora na frente do gol; a grua sobe até o telão da BLTV
          const u = t - 60;
          const k = easeIO(u / 100);
          const yp = pt(A, -0.6, 2.7);
          act(K, c.you, yp, { id: 'y', face: pt(A, -0.6, 9), anim: 'celebrate' });
          act(K, c.hiori, pt(A, lerp(-2.4, -1.3, ease(u / 70)), lerp(6.4, 3.4, ease(u / 70))), { id: 'h', face: yp, anim: u < 66 ? 'run' : 'celebrate' });
          act(K, c.kaiser, pt(A, 1.7, 2.9), { id: 'k', face: yp, frame: 0 });
          const val = Math.round((300000000 * easeIO(seg(u, 26, 70))) / 1000000) * 1000000;
          const tv = bltvCv(val, CE.cinePlayerName());
          // (placa virada para o sul, acima do gol: de frente para quem olha do campo)
          K.quad({ x: GX, y: 6.12, z: 1.3, w: 3.2, h: 1.8, ang: -Math.PI / 2, img: tv, em: true, dirty: !!tv.fresh });
          tv.fresh = false;
          cam(K, mixP(pt(A, 0.4, 6.4, 0.5), pt(A, 0.2, 7.0, 1.2), k), mixP(pt(A, -0.6, 2.7, 0.55), pt(A, -0.1, 0, 1.75), k), lerp(46, 52, k));
          st.tv = wp([GX, 6.12, 2.2]);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const c = CE.ptdNelCast();
      const st = resolve(K, K.st || {});
      const scoreBefore = () => CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: Math.max(0, c.score.hs - 1) }));
      if (phase === 0) {
        // o mundo sem cor; cada um ganha uma marca em pixel quando a leitura passa por ele
        bwBlue(ctx, W, H, 0.85);
        (st.pl || []).forEach((p) => {
          if (!p.s || p.lit <= 0) return;
          ctx.save();
          ctx.globalAlpha = p.lit;
          ctx.fillStyle = '#020617';
          ctx.fillRect(Math.round(p.s.x) - 7, Math.round(p.s.y) - 22, 14, 14);
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(p.s.x) - 4, Math.round(p.s.y) - 19, 8, 8);
          ctx.restore();
        });
        if (st.me) CE.cineGlow(ctx, st.me.x, st.me.y, 70, 'rgba(0,245,212,0.35)', 0.8);
        CE.cineSfx(S, 6, 'scan', () => window.SFX?.blip?.(660));
        scoreBefore();
      } else if (phase === 1) {
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.24 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        // na finta: o quadro da canhota recolhendo e a direita armando (pixel art)
        if (t > 56)
          cutBoot(ctx, S, seg(t, 56, 64), seg(t, 56, 110), {
            poly: [[W * 0.5, top + 20], [W - 22, top + 12], [W - 22, bot - 22], [W * 0.42, bot - 28]],
            from: [80, 0],
            bg: '#e2e8f0',
            ink: 'rgba(15,23,42,0.6)',
            radial: false,
            lineAng: -0.3,
            bx: 0.38,
            by: 0.4,
            f0: [0.9, 0.95],
            f1: [0.66, 0.7],
            a0: -1.1,
            a1: -0.2,
            flip: true,
            boot: '#ef4444',
            extra: (b, g, q) => {
              // a canhota indo embora (fantasma do outro lado)
              const CA = CE.ART;
              g.save();
              g.globalAlpha = 0.45 * (1 - q);
              CA.boot(g, b.x + b.w * lerp(0.2, 0.06, q), b.y + b.h * 0.78, b.h * 0.13, { sock: '#64748b', sock2: '#e2e8f0', boot: '#94a3b8', ang: 0.6 });
              g.restore();
            }
          });
        CE.cineSfx(S, 60, 'feint', () => window.SFX?.whoosh?.());
        scoreBefore();
      } else if (phase === 2) {
        const fp = st.foot || { x: W * 0.45, y: H * 0.55 };
        const KT = NEL_HIT;
        if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
        if (t >= KT) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
          if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
          if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 4, 26, '0,245,212', 0.85 * (1 - seg(t, KT + 30, KT + 60)));
          hitWord(ctx, 'DOM!!', W * 0.74, top + 120, 110, seg(t, KT, KT + 6), t - KT, W * 0.4, -0.1);
        }
        CE.cineSfx(S, KT, 'kick', () => window.SFX?.kick?.(1));
        scoreBefore();
      } else if (phase === 3) {
        if (st.ball && st.b2) CE.luckStreak(ctx, st.b2.x, st.b2.y, st.ball.x, st.ball.y, 2, 16, '0,245,212', 0.6);
        if (st.slow) {
          ctx.save();
          ctx.globalAlpha = 0.2 * st.slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 8, 'curve', () => window.SFX?.whoosh?.());
        scoreBefore();
      } else {
        const HIT = 18;
        if (t < 60) {
          netShotOverlay(ctx, S, st);
          scoreBefore();
        } else {
          if (st.tv) CE.cineGlow(ctx, st.tv.x, st.tv.y, 220, 'rgba(250,204,21,0.12)', seg(t, 80, 120));
          confetti(ctx, S, t, 0.6);
          CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { pop: 'home', popK: seg(t, 60, 76) }));
          CE.cineSfx(S, 130, 'offer', () => window.SFX?.jingle?.([784, 988, 1319], 0, 'triangle'));
        }
        CE.cineSfx(S, HIT, 'net', () => window.SFX?.goal?.(true));
      }
    }
  });

  // =========================================================================
  // 5) O GOL DO TÍTULO (u20_final_goal) — final da Copa Sub-20, Japão x França, 90+4'
  // O Loki sai jogando lá de trás e conduz na Velocidade Divina; o Hugo cola em você; o Rin
  // volta correndo e se choca com o Loki: a bola sobe na noite. O Hugo olha a bola, o mundo
  // perde a cor e só você se mexe: um passo para trás, de costas para o gol... e a
  // bicicleta. A cor volta no impacto, a bola passa por cima do Hugo e do goleiro, a rede
  // estufa e o Japão é campeão do mundo. O Rin olha do chão.
  // =========================================================================
  const FA = atk(false); // o Japão ataca o gol norte (o da França)
  const FP = (u, d, z = 0) => pt(FA, u, d, z);
  const F_CLASH = [-0.62, 7.3]; // onde o Rin se choca com o Loki (u, d)
  const F_KICK = [1.22, 4.95]; // onde você faz a bicicleta
  const F_HUGO = [1.24, 4.15]; // o Hugo colado em você (do lado do gol)
  const F_YOU0 = [1.72, 4.55]; // onde você está antes do lance
  // a bola depois do choque até o seu pé (q 0..1): sobe na noite e cai na sua frente
  const fFlight = (q) => FP(lerp(F_CLASH[0], F_KICK[0] - 0.02, q), lerp(F_CLASH[1], F_KICK[1] + 0.1, q), lerp(0.25, 0.92, q) + 4 * 1.75 * q * (1 - q));
  // a bola da bicicleta: por cima do Hugo até o ângulo esquerdo do goleiro
  const fShot = (q) => FP(lerp(F_KICK[0] - 0.02, -0.72, q), lerp(F_KICK[1] + 0.1, -0.1, q), lerp(0.92, 0.84, q) + Math.sin(q * Math.PI) * 0.42);
  const F_Q4 = [[0, 0.16], [64, 0.4], [124, 0.5], [150, 0.56]]; // plano 5: a subida (lenta no alto)
  const F_FROZEN = [0.56, 0.6]; // plano 6: quase parada
  const F_BIKE = 96; // plano 7: o impacto
  const F_PH = [170, 150, 140, 130, 150, 140, 150, 110, 130, 170, 140];
  const DARK = [0.24, 0.26, 0.34];

  function finalScene(K, S) {
    const { t, phase, f } = S;
    const c = CE.luckCfg('u20_final_goal');
    const st = (K.st = {});
    const W = wp;
    K.expo(1.0);
    const gkAt = (o = {}) => act(K, c.gk, FP(0, 0.42), Object.assign({ id: 'gk', face: FP(0, 9), frame: 0 }, o));
    if (phase === 0) {
      // ACRÉSCIMOS: a grua desce da arquibancada até a área da França; o Loki com a bola
      const k = easeIO(seg(t, 0, 170));
      const ld = lerp(1.4, 2.3, ease(t / 170));
      gkAt();
      act(K, c.rival, FP(-0.35, ld), { id: 'rv', face: FP(-0.4, 12), anim: t < 40 ? 'idle' : 'run', frame: t < 40 ? 0 : undefined });
      ball(K, FP(-0.35 + Math.sin(t * 0.4) * 0.03, ld + 0.3, 0.05));
      act(K, c.defender, FP(F_HUGO[0], F_HUGO[1]), { id: 'df', face: FP(F_YOU0[0], F_YOU0[1] + 2), anim: 'idle' });
      act(K, c.you, FP(F_YOU0[0], F_YOU0[1]), { id: 'y', face: FP(-0.4, ld), anim: 'idle' });
      act(K, c.mates[1], FP(-1.3, lerp(5.9, 5.4, k)), { id: 'm1', face: FP(-0.4, ld), anim: 'run' });
      act(K, c.mates[0], FP(-2.4, lerp(9.0, 8.4, k)), { id: 'm0', face: FP(-0.4, ld), anim: 'run' });
      act(K, c.rin, FP(-0.8, lerp(11.4, 10.6, k)), { id: 'rin', face: FP(-0.4, ld), anim: 'run' });
      act(K, c.foes[0], FP(-2.6, lerp(3.2, 3.7, k)), { id: 'f0', face: FP(-0.4, ld), anim: 'run' });
      cam(K, mixP(FP(4.4, 13.2, 5.8), FP(2.9, 8.6, 1.7), k), mixP(FP(0.4, 6.0, 0.3), FP(0.3, 3.0, 0.4), k), lerp(62, 46, k));
      st.you = W(FP(F_YOU0[0], F_YOU0[1], 1.1));
    } else if (phase === 1) {
      // VELOCIDADE DIVINA: de lado, baixo; o Loki some na frente da câmera e o Shidou chega tarde
      const ld = lerp(2.3, 6.3, easeIn(seg(t, 0, 150)) * 0.55 + seg(t, 0, 150) * 0.45);
      const lp = FP(lerp(-0.35, F_CLASH[0], seg(t, 0, 150)), ld);
      act(K, c.rival, lp, { id: 'rv', face: FP(lp[0] - GX, 12), anim: 'run' });
      ball(K, FP(lp[0] - GX + Math.sin(t * 0.6) * 0.03, ld + 0.32, 0.05));
      const sk = seg(t, 40, 80);
      act(K, c.mates[1], FP(lerp(-1.4, -0.75, ease(sk)), lerp(5.2, 4.7, ease(sk))), { id: 'm1', face: FP(-0.4, 2), anim: sk > 0.3 ? 'slide' : 'run' });
      groundHit(K, FP(-0.75, 4.7), t - 64, '#e0f2fe', 10, 13);
      // (a câmera vem atrás e não alcança: o Loki abre distância no quadro)
      const cd = lerp(2.0, 5.2, ease(seg(t, 0, 150)));
      cam(K, shake(K, FP(2.45, cd, 0.34), f, 0.01, 2), FP(lp[0] - GX - 0.2, lerp(cd, ld, 0.75), 0.42), 48);
      st.loki = W([lp[0], lp[1], 0.3]);
      st.loki1 = W([lp[0], lp[1] - 0.7, 0.3]);
    } else if (phase === 2) {
      // A SOMBRA DO HUGO: contraluz dos refletores do fundo; ele colado nas suas costas
      const k = easeIO(t / 140);
      act(K, c.you, FP(F_YOU0[0], F_YOU0[1]), { id: 'y', face: FP(-0.6, 7), frame: 0, light: [0.8, 0.84, 0.96] });
      // (um pouco ao lado: os dois inteiros no quadro, ele meio passo atrás)
      act(K, c.defender, FP(F_HUGO[0], F_HUGO[1] + lerp(0, 0.08, k)), { id: 'df', face: FP(F_YOU0[0], F_YOU0[1] + 1), frame: 0, light: [0.82, 0.8, 0.92] });
      // lá no fundo à esquerda o Loki passa voando com a bola
      const lq = seg(t, 20, 110);
      if (lq > 0 && lq < 1) {
        const lp = FP(F_CLASH[0], lerp(4.6, 7.4, lq));
        act(K, c.rival, lp, { id: 'rv', face: FP(F_CLASH[0], 12), anim: 'run' });
        ball(K, FP(F_CLASH[0], lp[1] - 6.6 + 0.32, 0.05));
      }
      gkAt();
      cam(K, shake(K, FP(lerp(2.6, 2.35, k), lerp(8.6, 8.2, k), lerp(0.5, 0.55, k)), f * 0.4, 0.004), FP(1.3, 4.2, 0.62), lerp(42, 38, k));
    } else if (phase === 3) {
      // O CHOQUE: o Rin volta correndo e entra de carrinho no Loki — câmera lenta no contato
      const a = remap(t, [[0, 0], [48, 48], [92, 58], [130, 96]]);
      const CL = 56;
      const tau = Math.max(0, a - CL);
      const lk = seg(a, 0, CL);
      const lp = a < CL ? FP(F_CLASH[0], lerp(5.9, F_CLASH[1] - 0.12, lk)) : FP(F_CLASH[0] + Math.min(0.3, tau * 0.01), F_CLASH[1] - 0.1 + Math.min(0.25, tau * 0.008));
      act(K, c.rival, lp, { id: 'rv', face: a < CL ? FP(F_CLASH[0], 12) : FP(F_CLASH[0] - 2, F_CLASH[1] - 3), anim: a < CL ? 'run' : 'fall', opts: { expr: 'angry' } });
      const rk = ease(seg(a, 0, CL));
      const rp = a < CL ? FP(F_CLASH[0] - 0.05, lerp(9.4, F_CLASH[1] + 0.3, rk)) : FP(F_CLASH[0] - 0.05, F_CLASH[1] + 0.3 - Math.min(0.25, tau * 0.01));
      act(K, c.rin, rp, { id: 'rin', face: FP(F_CLASH[0], 0), anim: a < CL - 14 ? 'run' : 'slide', opts: { expr: 'angry' } });
      const bp = a < CL ? FP(F_CLASH[0], lp[1] - 6.6 + 0.3, 0.05) : fFlight(Math.min(0.16, tau * 0.004));
      ball(K, bp);
      groundHit(K, FP(F_CLASH[0], F_CLASH[1] + 0.1), tau - 0.01, '#fef9c3', 18, 3);
      const tilt = easeIO(seg(a, CL + 2, 96));
      cam(K, shake(K, FP(1.9, F_CLASH[1] + 0.25, 0.18), f * 2, a >= CL ? 0.035 * Math.max(0, 1 - tau / 30) : 0.004, 6), FP(F_CLASH[0], F_CLASH[1] + 0.1, lerp(0.42, 1.2, tilt)), 46);
      st.clash = W(FP(F_CLASH[0], F_CLASH[1] + 0.1, 0.42));
      st.ball = W(bp);
      st.tau = a >= CL ? tau : -1;
    } else if (phase === 4) {
      // A BOLA SOBE: do chão, olhando para cima — a bola contra os refletores (lenta no alto)
      const q = remap(t, F_Q4);
      const bp = fFlight(q);
      ball(K, bp, { k: 0.85 });
      act(K, c.rival, FP(F_CLASH[0] + 0.3, F_CLASH[1] + 0.2), { id: 'rv', face: FP(F_CLASH[0] - 2, F_CLASH[1] - 3), anim: 'sit_floor' });
      act(K, c.rin, FP(F_CLASH[0] - 0.1, F_CLASH[1] + 0.55), { id: 'rin', face: bp, anim: 'sit_floor', opts: { expr: 'angry' } });
      // (de longe e de baixo: os dois caídos no terço de baixo, a bola subindo contra os refletores)
      const k = easeIO(t / 150);
      const look = mixP(FP(-0.4, 7.0, 0.55), FP(-0.1, 6.2, 1.5), easeIO(seg(t, 10, 120)));
      cam(K, shake(K, FP(lerp(2.0, 1.75, k), lerp(10.6, 10.3, k), 0.2), f * 0.5, 0.004), look, 54);
      st.ball = W(bp);
    } else if (phase === 5) {
      // O TEMPO PARA: do alto — o Hugo olha a bola (parado); só você se mexe, para trás dele
      const k = easeIO(t / 140);
      const q = lerp(F_FROZEN[0], F_FROZEN[1], t / 140);
      const bp = fFlight(q);
      ball(K, bp, { k: 0.85 });
      act(K, c.defender, FP(F_HUGO[0], F_HUGO[1]), { id: 'df', face: bp, frame: 0 });
      const yk = easeIO(seg(t, 20, 120));
      const yp = FP(lerp(F_YOU0[0], F_KICK[0], yk), lerp(F_YOU0[1], F_KICK[1], yk));
      act(K, c.you, yp, { id: 'y', face: FP(F_KICK[0], 12), anim: yk > 0 && yk < 1 ? 'run' : 'idle', frame: yk > 0 && yk < 1 ? Math.floor(t * 0.4) : 0 });
      act(K, c.rival, FP(F_CLASH[0] + 0.3, F_CLASH[1] + 0.2), { id: 'rv', face: FP(F_CLASH[0] - 2, F_CLASH[1] - 3), anim: 'sit_floor' });
      act(K, c.rin, FP(F_CLASH[0] - 0.1, F_CLASH[1] + 0.55), { id: 'rin', face: bp, anim: 'sit_floor' });
      act(K, c.mates[1], FP(-0.75, 4.75), { id: 'm1', face: bp, frame: 0 });
      gkAt();
      const ang = lerp(0.62, 0.42, k);
      const ctr = FP(0.9, 5.0);
      cam(K, [ctr[0] + Math.sin(ang) * 4.0, ctr[1] + Math.cos(ang) * 4.0, lerp(2.6, 2.3, k)], FP(0.85, 4.95, 0.8), 52);
      st.ball = W(bp);
      st.ballTop = W([bp[0], bp[1], 4.0]);
      st.you = W([yp[0], yp[1], 0.45]);
    } else if (phase === 6) {
      // DE BICICLETA: de lado, rente ao chão; a bola cai e você vira de costas no ar
      const hit = t >= F_BIKE;
      const u = Math.max(0, t - F_BIKE);
      const q = lerp(F_FROZEN[1], 1, easeIn(seg(t, 0, F_BIKE)));
      const jz = Math.sin(seg(t, F_BIKE - 30, F_BIKE + 40) * Math.PI) * 0.34;
      const yp = FP(F_KICK[0], F_KICK[1], jz);
      const anim = t < F_BIKE - 30 ? 'idle' : u < 44 ? 'bicycle' : 'fall';
      act(K, c.you, yp, { id: 'y', face: FP(F_KICK[0], 12), anim, frame: anim === 'idle' ? 0 : undefined, opts: anim === 'bicycle' ? { animTime: seg(t, F_BIKE - 30, F_BIKE) * 20 } : undefined });
      act(K, c.defender, FP(F_HUGO[0], F_HUGO[1]), { id: 'df', face: hit ? FP(0, 0) : FP(F_KICK[0], F_KICK[1]), anim: hit ? 'jump' : 'idle', frame: hit ? undefined : 0, opts: hit ? { animTime: Math.min(30, u) } : undefined });
      const bp = hit ? fShot(easeIn(seg(u, 0, 50)) * 0.5) : fFlight(q);
      ball(K, bp);
      // (de lado, longe o bastante para os dois inteiros; depois do impacto a bola sai do
      // quadro na direção do gol e a câmera só acompanha um pouco)
      const push = easeIO(seg(t, 0, F_BIKE));
      const pan = ease(seg(u, 4, 40)) * 0.35;
      const look = mixP(FP(F_KICK[0] - 0.05, F_KICK[1] - 0.35, 0.68), FP(0.6, 2.6, 0.9), pan);
      cam(K, shake(K, FP(lerp(4.3, 4.0, push), F_KICK[1] - 0.2, lerp(0.34, 0.3, push)), f * 2, hit ? 0.034 * Math.max(0, 1 - u / 28) : 0.003, 3), look, lerp(46, 42, push));
      st.foot = W(FP(F_KICK[0] - 0.02, F_KICK[1] + 0.1, 0.92));
      st.ball = W(bp);
    } else if (phase === 7) {
      // RUMO AO GOL: rente à trave; o goleiro voa e a bola passa por cima da luva (lenta)
      const qk = remap(t, [[0, 0.5], [44, 0.78], [84, 0.86], [110, 1.02]]);
      const bp = fShot(Math.min(1, qk));
      if (qk < 1) ball(K, bp);
      const dq = seg(qk, 0.58, 0.98);
      act(K, c.gk, FP(lerp(0, -0.52, ease(dq)), 0.5, Math.sin(dq * Math.PI) * 0.4), { id: 'gk', face: FP(-5, 0.5), anim: dq > 0.05 ? 'dive' : 'idle', opts: dq > 0.05 ? { animTime: dq * 30 } : undefined });
      // (atrás da bola, um pouco acima: o goleiro cruza o quadro e não alcança; a câmera para
      // antes da trave e a bola segue sozinha para o gol)
      const cb = fShot(Math.min(0.8, qk));
      const e = [cb[0] + 0.32, cb[1] + 1.15, cb[2] + 0.16];
      cam(K, shake(K, e, f * 2, 0.008, 4), FP(-0.62, -0.3, 0.7), 52);
      st.ball = W(bp);
      st.b1 = W(fShot(Math.max(0.5, Math.min(1, qk) - 0.05)));
      st.slow = seg(t, 44, 52) * (1 - seg(t, 80, 90));
    } else if (phase === 8) {
      // A REDE: de dentro do gol
      const HIT = 26;
      netShot(K, S, FA, t, { cu: -0.72, cz: 0.84, from: [-0.45, 2.2, 0.98], hit: HIT, keeper: c.gk });
      act(K, c.defender, FP(F_HUGO[0], F_HUGO[1]), { id: 'df', face: FP(-0.7, 0), frame: 0 });
      const up = t > 70;
      act(K, c.you, FP(lerp(F_KICK[0], 0.4, seg(t, 70, 130)), lerp(F_KICK[1], 3.6, seg(t, 70, 130))), { id: 'y', face: up ? FP(-2, 2) : FP(F_KICK[0], 12), anim: up ? 'run' : 'sit_floor' });
    } else if (phase === 9) {
      // CAMPEÕES: você de braços abertos contra os refletores; o Hugo de joelhos; a grua sobe
      const k = easeIO(seg(t, 30, 170));
      const yp = FP(-1.0, 3.0);
      act(K, c.you, yp, { id: 'y', face: FP(-1.0, 0), anim: 'celebrate', light: [lerp(0.4, 1, k), lerp(0.42, 1, k), lerp(0.52, 1.05, k)] });
      act(K, c.mates[0], FP(lerp(-0.2, -0.45, ease(seg(t, 10, 120))), lerp(6.4, 3.8, ease(seg(t, 10, 120)))), { id: 'm0', face: yp, anim: t < 120 ? 'run' : 'celebrate' });
      act(K, c.mates[1], FP(lerp(-2.7, -1.75, ease(seg(t, 20, 130))), lerp(6.8, 3.6, ease(seg(t, 20, 130)))), { id: 'm1', face: yp, anim: t < 130 ? 'run' : 'celebrate' });
      act(K, c.defender, FP(F_HUGO[0] - 0.3, F_HUGO[1] + 0.2), { id: 'df', face: FP(F_HUGO[0], 0), anim: 'kneel_down' });
      act(K, c.rin, FP(F_CLASH[0] - 0.1, F_CLASH[1] + 0.55), { id: 'rin', face: yp, anim: 'sit_floor' });
      cam(K, mixP(FP(-0.8, 1.0, 0.36), FP(-0.4, 0.85, 2.9), k), mixP(FP(-1.0, 3.0, 0.66), FP(-0.7, 7.0, 0.4), k), lerp(44, 60, k));
      st.you = W(FP(-1.0, 3.0, 0.55));
    } else {
      // O OLHAR DO RIN: sentado no gramado, olhando você comemorar lá na frente
      const k = easeIO(t / 140);
      const yp = FP(-1.0, 3.0);
      act(K, c.rin, FP(F_CLASH[0] - 0.1, F_CLASH[1] + 0.55), { id: 'rin', face: yp, anim: 'sit_floor', light: [0.62, 0.66, 0.78], opts: { expr: 'angry' } });
      act(K, c.you, yp, { id: 'y', face: FP(-1.0, 0), anim: 'celebrate' });
      act(K, c.mates[0], FP(-0.45, 3.4), { id: 'm0', face: yp, anim: 'celebrate' });
      act(K, c.mates[1], FP(-1.7, 3.4), { id: 'm1', face: yp, anim: 'celebrate' });
      // (de lado e de trás do Rin, longe: ele no canto do quadro, a festa lá no fundo)
      cam(K, FP(lerp(2.05, 1.85, k), lerp(9.5, 9.3, k), 0.5), FP(lerp(-0.75, -0.9, k), 5.2, 0.45), lerp(44, 40, k));
    }
  }

  function finalOverlay(ctx, S, K) {
    const { W, H, t, phase, top, bot } = S;
    const c = CE.luckCfg('u20_final_goal');
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
    } else if (phase === 1) {
      // a Velocidade Divina: linhas paralelas e o risco dourado atrás do Loki
      const g = CE.luckGrassCv && CE.luckGrassCv();
      if (g) ctx.drawImage(g, -160, bot - 90, W + 320, 120);
      CE.drawSpeedLines(ctx, W, H, '#fde68a', 0.1);
      if (st.loki && st.loki1) CE.luckStreak(ctx, st.loki1.x, st.loki1.y, st.loki.x, st.loki.y, 2, 22, '253,224,71', 0.55);
      CE.cineSfx(S, 64, 'carrinho', () => window.SFX?.tackle?.());
      score(c.before[0], c.before[1]);
    } else if (phase === 2) {
      flares(ctx, K, S, 1);
      score(c.before[0], c.before[1]);
    } else if (phase === 3) {
      const tau = st.tau;
      if (tau >= 0) {
        const cp = st.clash || { x: W / 2, y: H * 0.6 };
        CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(tau, 0.5, 5)), '#fef9c3');
        if (tau < 6) CE.drawRadialSpeedLines(ctx, cp.x, cp.y, W, '#fef9c3', 0.45 * (1 - tau / 6));
        CE.cineGlow(ctx, cp.x, cp.y, 140, 'rgba(253,224,71,0.5)', 1 - seg(tau, 0, 14));
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.6)', 0.9);
      }
      CE.cineSfx(S, 80, 'choque', () => window.SFX?.tackle?.());
      score(c.before[0], c.before[1]);
    } else if (phase === 4) {
      flares(ctx, K, S, 1);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 60, 'rgba(255,255,255,0.5)', 0.8);
      ctx.save();
      ctx.globalAlpha = 0.22 * seg(t, 50, 70) * (1 - seg(t, 130, 150));
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (phase === 5) {
      // a cor vai embora em círculo da bola; o feixe de luz nela; você com um brilho ciano
      const b = st.ball || { x: W / 2, y: H * 0.3 };
      bwBlue(ctx, W, H, 1, { inside: true, x: b.x, y: b.y, r: ease(seg(t, 0, 50)) * W * 1.4 });
      if (st.ball && st.ballTop) CE.cineShafts(ctx, st.ball.x, Math.max(top - 40, st.ballTop.y), Math.PI / 2, Math.max(80, st.ball.y - st.ballTop.y + 30), 0.3, 4, '241,245,249', 0.14, t);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.5)', 0.9);
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 80, 'rgba(0,245,212,0.3)', seg(t, 30, 60));
      CE.cineSfx(S, 4, 'para', () => window.SFX?.whoosh?.());
    } else if (phase === 6) {
      const KT = F_BIKE;
      const fp = st.foot || { x: W * 0.45, y: H * 0.5 };
      if (t < KT) bwBlue(ctx, W, H, 1);
      else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, KT, KT + 16)) * W * 1.4 });
      if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
      if (t >= KT) {
        CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
        if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
        if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '0,245,212', 0.85 * (1 - seg(t, KT + 30, KT + 54)));
        hitWord(ctx, 'DOM!!', W * 0.26, top + 120, 110, seg(t, KT, KT + 6), t - KT, W * 0.4, -0.1);
      } else if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 44, 'rgba(255,255,255,0.45)', 0.9);
      // antes do impacto: o quadro da sua chuteira de cabeça para baixo indo na bola
      if (t > 58 && t < KT)
        cutBoot(ctx, S, seg(t, 58, 66), seg(t, 58, KT), {
          poly: [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]],
          from: [0, -50],
          glow: 'rgba(0,245,212,0.35)',
          burst: 0.84,
          bx: 0.6,
          by: 0.34,
          f0: [0.34, 0.12],
          f1: [0.5, 0.18],
          a0: Math.PI + 0.9,
          a1: Math.PI - 0.1,
          flip: true
        });
      CE.cineSfx(S, KT, 'bicicleta', () => window.SFX?.kick?.(1));
    } else if (phase === 7) {
      if (st.ball && st.b1) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 3, 24, '0,245,212', 0.7);
      if (st.slow) {
        ctx.save();
        ctx.globalAlpha = 0.22 * st.slow;
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      flares(ctx, K, S, 0.6);
      CE.cineSfx(S, 4, 'vento', () => window.SFX?.whoosh?.());
      score(c.before[0], c.before[1]);
    } else if (phase === 8) {
      const HIT = 26;
      netShotOverlay(ctx, S, st, 'GOOOOOL!!', 150);
      if (st.hit) CE.cineBokeh(ctx, W, top, top + (bot - top) * 0.5, t, 30, ['rgba(255,255,255,0.6)', 'rgba(250,204,21,0.5)'], 4);
      score(st.hit ? c.after[0] : c.before[0], c.after[1], 1, st.hit ? 1 - seg(t, HIT, HIT + 30) : 0);
      CE.cineSfx(S, HIT, 'rede', () => window.SFX?.goal?.());
    } else if (phase === 9) {
      flares(ctx, K, S, 1);
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 170, 'rgba(255,255,255,0.2)', 1 - seg(t, 30, 120) * 0.7);
      confetti(ctx, S, t);
      const k2 = seg(t, 100, 124);
      if (k2 > 0) {
        CE.luckKicker(ctx, W / 2 - 170, top + 54, c.kicker, k2, '#e2e8f0');
        CE.cineImpactText(ctx, c.bigTitle, W / 2, top + 130, 84, '#f8fafc', k2, W * 0.8, 0);
      }
      score(c.after[0], c.after[1]);
    } else {
      fadeOut(ctx, S, seg(t, 110, 140));
    }
  }

  CE.registerCine3D('u20_final_goal', {
    phases: F_PH,
    music: 'epic',
    theme: 'worldcup_final',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    get title() {
      return CE.luckCfg('u20_final_goal').title;
    },
    tags: ['PLANO 1 • ACRÉSCIMOS', 'PLANO 2 • VELOCIDADE DIVINA', 'PLANO 3 • A SOMBRA DO HUGO', 'PLANO 4 • O CHOQUE', 'PLANO 5 • A BOLA SOBE', 'PLANO 6 • O TEMPO PARA', 'PLANO 7 • DE BICICLETA', 'PLANO 8 • RUMO AO GOL', 'PLANO 9 • A REDE', 'PLANO 10 • CAMPEÕES', 'PLANO 11 • O OLHAR DO RIN'],
    get subs() {
      const c = CE.luckCfg('u20_final_goal');
      const me = CE.cinePlayerName();
      return [
        [{ from: 40, who: 'NARRADOR', text: c.stakes, color: NARR }],
        [{ from: 20, who: c.rivalName, text: `"${c.rivalLine}"`, color: c.rivalRim }],
        [{ from: 20, who: 'HUGO', text: '"Você não sai da minha sombra."', color: '#ec4899' }],
        [{ from: 8, who: 'RIN ITOSHI', text: '"Sai da frente."', color: '#2dd4bf' }],
        [{ from: 8, who: me, text: '(Sorte só cai pra quem está embaixo.)', color: YOU }],
        [{ from: 24, who: me, text: '(Só eu me mexo nesse mundo.)', color: YOU }],
        [{ from: 62, who: 'NARRADOR', text: `Tarde demais, ${c.defName}!`, color: NARR }],
        [{ from: 24, who: 'NARRADOR', text: `${c.gkShort} não alcança!`, color: NARR }],
        [{ from: 30, who: 'NARRADOR', text: c.goalCall, color: '#facc15' }],
        [{ from: 20, who: 'NARRADOR', text: c.goalSub, color: NARR }],
        [{ from: 24, who: 'RIN ITOSHI', text: '"Esse gol... era MEU."', color: '#2dd4bf' }]
      ];
    },
    scene: finalScene,
    overlay: finalOverlay
  });
})();
