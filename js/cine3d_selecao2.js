// ============================================================================
// CUTSCENES EM 3D — a Segunda Seleção (js/cine_selecao2.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   bluelock_man_test            • a câmara branca (montada no vazio K.VOID): o robô no gol
//   rin_takes_bachira(_win)      • a sala branca do 3x3 (no vazio): o Rin leva o Bachira
//   barou_devour                 • o campo do prédio: você devora o Rei
//   world_five_fall / _win       • o campo (estádio holográfico) e o telão do saguão
// Os closes nos olhos, as páginas de mangá, as cartelas e os textos grandes ficam no overlay
// (usando os ajudantes 2D da cine_selecao2/cine_final/cine_wildcard).
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
  // curva de Bézier quadrática em 3D ([x, y, z])
  const bez3 = (a, c, b, k) => a.map((v, i) => lerp(lerp(v, c[i], k), lerp(c[i], b[i], k), k));
  // canvas feito UMA vez
  const mkCv = (w, h, fn) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (fn) fn(g, w, h);
    return cv;
  };
  const lazy = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };

  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const TEAL = { jerseyPrimary: '#134e4a', jerseySecondary: '#5eead4' };
  const WORLD = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#b45309' };
  const ROBOT = {
    id: 'ssel_robot', name: 'BLUE LOCK MAN', skinColor: '#1e3a8a', hairColor: '#00f5d4', hairSecondary: '#38bdf8', eyeColor: '#00f5d4',
    hairStyle: 'short_sharp', jerseyPrimary: '#090d16', jerseySecondary: '#00f5d4', auraColor: '#00f5d4'
  };

  const YOU_C = '#00f5d4';
  const EGO_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const RIN_C = '#22d3ee';
  const BACH_C = '#facc15';
  const NAGI_C = '#cbd5e1';
  const ARYU_C = '#c084fc';
  const TOKI_C = '#a3e635';
  const BAROU_C = '#f87171';
  const LOKI_C = '#fbbf24';

  // placa em pé com a imagem lida da esquerda para a direita por quem olha de frente
  // (o K.quad espelha a imagem em alguns ângulos; aqui os cantos são montados à mão)
  function plate(K, o) {
    const ang = o.ang ?? 0;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const hw = o.w / 2;
    const L = [o.x - ny * hw, o.y + nx * hw];
    const R = [o.x + ny * hw, o.y - nx * hw];
    const z0 = o.z || 0;
    const z1 = z0 + o.h;
    const v = [];
    const P = (x, z, y, u, vv) => v.push(x, z, y, u, vv, nx, 0, ny);
    P(L[0], z1, L[1], 0, 0);
    P(R[0], z1, R[1], 1, 0);
    P(R[0], z0, R[1], 1, 1);
    P(L[0], z1, L[1], 0, 0);
    P(R[0], z0, R[1], 1, 1);
    P(L[0], z0, L[1], 0, 1);
    K._push(v, o);
  }

  // ---------------------------------------------------------------- ajudantes do overlay
  // ponto do mundo na tela (x, altura, y)
  const scr = (K, x, h, y) => K.screen(x, h, y) || { x: -999, y: -999 };
  // risco atrás da bola (pontos 3D [x, y, z] → tela)
  function streak3(ctx, K, pts, color, w, alpha) {
    const p = pts.map((q) => K.screen(q[0], q[2], q[1])).filter(Boolean);
    if (p.length > 1) CE.ptdStreak(ctx, p, color, w, alpha);
  }
  // a previsão da máquina: arco tracejado da bola até o alvo (k = quanto já desenhou)
  function predict3(ctx, K, a, b, k, t, label, rgb = '0,200,230') {
    if (k <= 0) return;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(a[2], b[2]) + 0.45];
    const e = ease(k);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.strokeStyle = `rgba(${rgb},0.95)`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const q = bez3(a, c, b, (i / 24) * e);
      const p = scr(K, q[0], q[2], q[1]);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const pb = scr(K, b[0], b[2], b[1]);
    if (e > 0.95) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgb(${rgb})`;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(pb.x + sx * 18, pb.y + sy * 18 - sy * 8);
        ctx.lineTo(pb.x + sx * 18, pb.y + sy * 18);
        ctx.lineTo(pb.x + sx * 18 - sx * 8, pb.y + sy * 18);
        ctx.stroke();
      });
    }
    ctx.restore();
    if (label && e > 0.9) CE.ptdChip(ctx, label, pb.x, pb.y - 40, `rgb(${rgb})`, seg(k, 0.9, 1), { size: 12 });
  }
  // faixa dos olhos em close (painel de mangá atravessando a tela)
  function eyeStrip(ctx, S, char, k, o = {}) {
    if (k <= 0) return;
    const { W } = S;
    const y = o.y ?? (S.top + S.bot) / 2;
    const h = o.h || 230;
    const x0 = o.x0 ?? 20;
    const x1 = o.x1 ?? W - 20;
    const cx = o.cx ?? (x0 + x1) / 2;
    const dir = o.dir || -1;
    const pts = [[x0, y - h / 2 + 8], [x1, y - h / 2], [x1, y + h / 2 - 8], [x0, y + h / 2]];
    CE.finPanel(ctx, pts, () => {
      ctx.fillStyle = o.bg || '#020409';
      ctx.fillRect(x0 - 10, y - h / 2 - 10, x1 - x0 + 20, h + 20);
      if (o.glow) CE.cineGlow(ctx, cx, y, h * 1.2, o.glow);
      const z = 1 + (o.zoom || 0);
      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(z, z);
      ctx.translate(-cx, -y);
      const U = CE.wcdEyeBand(ctx, char, cx, y + (o.ey || 0), o.dw || (x1 - x0) * 0.95, o.band || {});
      if (o.eyesFn) o.eyesFn(U, cx, y + (o.ey || 0));
      else CE.wcdEyes(ctx, cx, y + (o.ey || 0), U, Object.assign({ char }, o.eyes || {}));
      if (o.after) o.after(U, cx, y + (o.ey || 0));
      ctx.restore();
      if (o.fx) o.fx();
    }, { dx: (1 - ease(k)) * W * dir * (o.vert ? 0 : 1), dy: o.vert ? (1 - ease(k)) * 400 * dir : 0, border: o.border || '#f8fafc' });
  }
  // cartela de abertura no preto (igual à 2D)
  function introCard(ctx, S, t, intro, o) {
    const { W, H, top, bot } = S;
    ctx.fillStyle = '#020409';
    ctx.fillRect(0, 0, W, H);
    const cy = (top + bot) / 2;
    CE.cineGlow(ctx, W / 2, cy, 380, o.glow || 'rgba(56,189,248,0.18)', seg(t, 0, 20));
    CE.finKicker(ctx, W / 2, cy - (o.kickY || 74), o.kicker, seg(t, 2, 24), o.kickColor || '#38bdf8', 'center');
    CE.rincStamp(ctx, o.stamp, W / 2, cy + (o.stampY || 0), o.size || 104, '#f8fafc', t, o.t0 || 8, o.step || 3, W * 0.7);
    if (o.sub) CE.finKicker(ctx, W / 2, cy + 78, o.sub, seg(t, 22, 40), o.subColor || YOU_C, 'center');
    CE.cineFlash(ctx, W, H, seg(t, intro - 12, intro), '#f8fafc');
  }

  // ---------------------------------------------------------------- a sala branca (no vazio)
  // Paredes brancas, piso com a grade ciano, painéis de luz no teto, telão na parede do fundo
  const RM = { x0: 80, x1: 92, y0: 9.6, y1: 21.6, h: 2.5, cx: 86 };
  const PXT = 16; // px por ladrilho nas texturas da sala
  const floorCv = (marks) =>
    mkCv((RM.x1 - RM.x0) * PXT, (RM.y1 - RM.y0) * PXT, (g, w, h) => {
      g.fillStyle = '#e9eff6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(56,189,248,0.2)';
      for (let x = 0; x < w; x += PXT) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += PXT) g.fillRect(0, y, w, 1);
      const X = (x) => Math.round((x - RM.x0) * PXT);
      const Y = (y) => Math.round((y - RM.y0) * PXT);
      g.strokeStyle = 'rgba(14,165,233,0.75)';
      g.lineWidth = 2;
      if (marks) {
        // a grande área e a pequena área na frente do gol
        g.strokeRect(X(83.4), Y(11.0), X(88.6) - X(83.4), Y(14.3) - Y(11.0));
        g.strokeRect(X(84.6), Y(11.0), X(87.4) - X(84.6), Y(12.2) - Y(11.0));
        g.beginPath();
        g.moveTo(0, Y(11.0));
        g.lineTo(w, Y(11.0));
        g.stroke();
        g.fillStyle = 'rgba(14,165,233,0.8)';
        g.fillRect(X(86) - 2, Y(15.2) - 2, 4, 4);
      } else {
        // o campinho do 3x3: o círculo do meio
        g.beginPath();
        g.arc(X(86), Y(15.6), 2.2 * PXT, 0, TAU);
        g.stroke();
        g.beginPath();
        g.moveTo(0, Y(15.6));
        g.lineTo(w, Y(15.6));
        g.stroke();
      }
    });
  const FLOOR_GOAL = lazy(() => floorCv(true));
  const FLOOR_PLAIN = lazy(() => floorCv(false));
  const WALL = lazy(() =>
    mkCv(12 * PXT, Math.round(RM.h * PXT), (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#f8fafc');
      gr.addColorStop(1, '#dbe3ec');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(148,163,184,0.55)';
      for (let x = 0; x < w; x += 2 * PXT) g.fillRect(x, 0, 1, h);
      g.fillStyle = '#38bdf8';
      g.fillRect(0, Math.round(h - 0.62 * PXT), w, 2);
      g.fillStyle = '#94a3b8';
      g.fillRect(0, h - 3, w, 3);
    })
  );
  const RING = lazy(() =>
    mkCv(64, 64, (g) => {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(32, 32, 28, 0, TAU);
      g.stroke();
      g.setLineDash([6, 5]);
      g.lineWidth = 2;
      g.beginPath();
      g.arc(32, 32, 20, 0, TAU);
      g.stroke();
    })
  );
  const NET = lazy(() =>
    mkCv(32, 32, (g) => {
      g.fillStyle = 'rgba(241,245,249,0.9)';
      for (let i = 0; i < 32; i += 4) {
        g.fillRect(i, 0, 1, 32);
        g.fillRect(0, i, 32, 1);
      }
    })
  );

  // telão da sala (canvas guardado; só redesenha quando o texto muda ou a faixa anda)
  const SCREEN = { cv: null, key: '' };
  function roomScreen(o, t) {
    if (!SCREEN.cv) SCREEN.cv = mkCv(340, 110);
    const band = Math.floor((t * 1.2) / 3) % 36;
    const key = `${o.title}|${o.sub}|${o.rgb}|${o.kick || ''}|${o.dark ? 1 : 0}|${band}`;
    if (key === SCREEN.key) return { cv: SCREEN.cv, dirty: false };
    SCREEN.key = key;
    const g = SCREEN.cv.getContext('2d');
    const w = 340;
    const h = 110;
    g.fillStyle = o.dark ? '#0b1222' : '#d6ecfa';
    g.fillRect(0, 0, w, h);
    g.fillStyle = `rgba(${o.rgb},0.12)`;
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    g.strokeStyle = `rgb(${o.rgb})`;
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (o.kick) {
      g.font = '900 13px "Segoe UI", sans-serif';
      g.fillStyle = o.dark ? '#94a3b8' : '#0369a1';
      g.fillText(o.kick.split('').join(' '), w / 2, 22);
    }
    g.font = 'italic 900 30px "Segoe UI", sans-serif';
    g.fillStyle = `rgb(${o.rgb})`;
    g.fillText(o.title, w / 2, o.kick ? 56 : 44, w - 24);
    g.font = '900 13px "Segoe UI", sans-serif';
    g.fillStyle = o.subColor || (o.dark ? '#fb7185' : `rgb(${o.rgb})`);
    g.fillText(o.sub || '', w / 2, o.kick ? 88 : 80, w - 20);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(4, Math.round((band / 36) * (h - 8)) + 4, w - 8, 4);
    return { cv: SCREEN.cv, dirty: true };
  }

  // monta a sala: o = { tint, goal, screen: {title, sub, rgb}, door (0..1), marks, lights, t }
  function whiteRoom(K, o = {}) {
    const tint = o.tint || '#ffffff';
    K.sky('#cbd5e1', '#e2e8f0', 0);
    K.fog(o.fog || '#dbe4ee', o.fogK ?? 0.018);
    K.ambient(o.amb || '#eef2f7');
    // piso, teto e as 4 paredes
    K.floor({ x0: RM.x0, y0: RM.y0, x1: RM.x1, y1: RM.y1, img: o.goal ? FLOOR_GOAL() : FLOOR_PLAIN(), color: tint });
    K.floor({ x0: RM.x0, y0: RM.y0, x1: RM.x1, y1: RM.y1, z: RM.h, color: o.ceil || '#e2e8f0' });
    const lit = o.lights ?? 4;
    for (let i = 0; i < 4; i++) {
      const y = RM.y0 + 1.5 + i * 2.8;
      const on = i < lit;
      K.floor({ x0: RM.cx - 1.6, y0: y, x1: RM.cx + 1.6, y1: y + 1.1, z: RM.h - 0.01, color: on ? '#ffffff' : '#94a3b8', em: on });
    }
    const wall = WALL();
    const W2 = (RM.x1 - RM.x0) / 2;
    const D2 = (RM.y1 - RM.y0) / 2;
    K.quad({ x: RM.cx, y: RM.y0, w: RM.x1 - RM.x0, h: RM.h, ang: Math.PI / 2, img: wall, color: tint });
    K.quad({ x: RM.cx, y: RM.y1, w: RM.x1 - RM.x0, h: RM.h, ang: -Math.PI / 2, img: wall, color: tint });
    K.quad({ x: RM.x0, y: RM.y0 + D2, w: RM.y1 - RM.y0, h: RM.h, ang: 0, img: wall, color: tint });
    K.quad({ x: RM.x1, y: RM.y0 + D2, w: RM.y1 - RM.y0, h: RM.h, ang: Math.PI, img: wall, color: tint });
    void W2;
    // a porta do fundo (embaixo do telão)
    if (o.door !== undefined) {
      K.quad({ x: RM.cx, y: RM.y0 + 0.012, w: 1.0, h: 1.18, ang: Math.PI / 2, color: '#94a3b8' });
      const ow = 0.86 * clamp(o.door);
      if (ow > 0.02) {
        K.quad({ x: RM.cx, y: RM.y0 + 0.02, w: ow, h: 1.1, ang: Math.PI / 2, color: '#0f1d33' });
        K.quad({ x: RM.cx, y: RM.y0 + 0.024, w: ow * 0.7, h: 0.5, z: 0.45, ang: Math.PI / 2, color: '#22d3ee', alpha: 0.35 * clamp(o.door), em: true });
      }
    }
    // o telão
    if (o.screen) {
      const s = roomScreen(o.screen, o.t || 0);
      plate(K, { x: RM.cx, y: RM.y0 + 0.03, z: 1.3, w: 3.4, h: 1.1, ang: Math.PI / 2, img: s.cv, dirty: s.dirty, light: [1.12, 1.12, 1.12] });
      K.quad({ x: RM.cx, y: RM.y0 + 0.02, z: 1.26, w: 3.52, h: 1.18, ang: Math.PI / 2, color: `rgb(${o.screen.rgb})`, em: true });
    }
  }

  // ==========================================================================
  // 1. O BLUE LOCK MAN — a câmara branca
  // ==========================================================================
  const GOAL = { y: 11.0, back: 10.25, x0: 84.8, x1: 87.2, h: 1.05 };
  const ROB = [86, 11.45];
  const ME = [85.85, 16.7];
  const BALL0 = [86.15, 16.15, 0.05];
  const SHOTS = [
    { w0: 16, k: 32, hit: 50, tgt: [85.15, 11.1, 0.72], dir: -1 },
    { w0: 150, k: 166, hit: 184, tgt: [86.95, 11.1, 0.86], dir: 1 }
  ];
  // o gol holográfico (traves acesas, rede de fios)
  function chamberGoal(K, green) {
    const post = green ? '#86efac' : '#e0f2fe';
    K.box({ x0: GOAL.x0 - 0.05, y0: GOAL.y - 0.05, x1: GOAL.x0 + 0.05, y1: GOAL.y + 0.05, z1: GOAL.h, color: post, em: true });
    K.box({ x0: GOAL.x1 - 0.05, y0: GOAL.y - 0.05, x1: GOAL.x1 + 0.05, y1: GOAL.y + 0.05, z1: GOAL.h, color: post, em: true });
    K.box({ x0: GOAL.x0 - 0.05, y0: GOAL.y - 0.05, x1: GOAL.x1 + 0.05, y1: GOAL.y + 0.05, z0: GOAL.h - 0.08, z1: GOAL.h + 0.02, color: post, em: true });
    const net = NET();
    const nc = green ? '#4ade80' : '#22d3ee';
    const d = GOAL.y - GOAL.back;
    K.quad({ x: (GOAL.x0 + GOAL.x1) / 2, y: GOAL.back, w: GOAL.x1 - GOAL.x0, h: GOAL.h * 0.92, ang: Math.PI / 2, img: net, color: nc, alpha: 0.85 });
    K.quad({ x: GOAL.x0, y: GOAL.back + d / 2, w: d, h: GOAL.h * 0.95, ang: 0, img: net, color: nc, alpha: 0.85 });
    K.quad({ x: GOAL.x1, y: GOAL.back + d / 2, w: d, h: GOAL.h * 0.95, ang: Math.PI, img: net, color: nc, alpha: 0.85 });
    K.floor({ x0: GOAL.x0, y0: GOAL.back, x1: GOAL.x1, y1: GOAL.y, z: GOAL.h * 0.97, img: net, color: nc, alpha: 0.85 });
  }
  // o robô: parado (sway), mergulhando ou se materializando (rv 0..1)
  function robot(K, t, o = {}) {
    const rv = o.rv ?? 1;
    if (rv <= 0) return;
    const x = o.x ?? ROB[0] + Math.sin(t * 0.05) * 0.08;
    const y = o.y ?? ROB[1];
    const light = rv < 1 ? K.mix([0.4, 1.6, 1.6], [1.15, 1.2, 1.25], rv) : o.light || [1.15, 1.2, 1.25];
    if (o.dive) K.actor(ROBOT, { x, y, z: o.z || 0, ang: o.dir < 0 ? Math.PI : 0, anim: 'dive', frame: 1, light, k: 0.92 });
    else K.actor(ROBOT, { x, y, z: o.z || 0, face: [ME[0], 20], anim: 'idle', light, alpha: rv < 1 ? 0.35 + 0.65 * rv : o.alpha ?? 1, k: 0.92 });
    if (rv < 1) {
      // a linha de luz subindo pelo corpo e o anel no chão
      K.floor({ x0: x - 0.42, y0: y - 0.2, x1: x + 0.42, y1: y + 0.2, z: 0.02 + rv * 0.88, color: '#00f5d4', alpha: 0.6, em: true });
      K.quad({ x, y, w: 0.9, h: RM.h, ang: Math.PI / 2, color: '#67e8f9', alpha: 0.14 * (1 - rv) + 0.04, em: true });
    }
  }

  CE.registerCine3D('bluelock_man_test', {
    phases: [280, 300, 300, 300, 330],
    music: 'tension',
    title: '🤖 O BLUE LOCK MAN',
    tags: ['PLANO 1 • A CÂMARA BRANCA', 'PLANO 2 • DEFENDIDO', 'PLANO 3 • LIDO', 'PLANO 4 • UMA ARMA', 'PLANO 5 • DE PRIMEIRA'],
    subs: [
      [{ from: 34, to: 278, who: 'EGO', text: '"Segunda Seleção, primeira fase: derrote o BLUE LOCK MAN."', color: EGO_C }],
      [{ from: 40, to: 298, who: 'NARRADOR', text: 'A máquina defende antes mesmo de você chutar.', color: NARR_C }],
      [{ from: 24, to: 298, who: 'VOCÊ', text: '(Ele lê tudo. Cada passo. Cada chute.)', color: YOU_C }],
      [{ from: 16, to: 298, who: 'VOCÊ', text: '(Preciso de uma arma que a máquina não leia.)', color: YOU_C }],
      [{ from: 110, to: 328, who: 'EGO', text: '"Passou. Bem-vindo à próxima fase."', color: EGO_C }]
    ],
    grain: 0,
    vignette: 0.5,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, dur } = S;
      K.expo(0.95);
      const shake = (a) => [K.noise(S.f * 0.9, 1) * a, K.noise(S.f * 0.9, 5) * a * 0.6];
      if (phase === 0) {
        const u = Math.max(0, t - 50);
        const rv = ease(seg(u, 40, 150));
        whiteRoom(K, { goal: true, t, screen: { title: 'BLUE LOCK MAN', sub: rv < 1 ? 'I N I C I A N D O . . .' : 'FASE 1 • DERROTE-O', rgb: '14,165,233' } });
        chamberGoal(K);
        // o círculo de onde ele nasce
        const ring = seg(u, 20, 50) * (1 - 0.5 * seg(u, 150, 200));
        if (ring > 0) K.floor({ x0: ROB[0] - 0.75, y0: ROB[1] - 0.75, x1: ROB[0] + 0.75, y1: ROB[1] + 0.75, z: 0.012, img: RING(), color: '#00f5d4', alpha: 0.9 * ring, em: true });
        robot(K, u, { rv: u > 0 ? Math.max(0.001, rv) : 0 });
        K.ball(BALL0[0], BALL0[1], BALL0[2]);
        K.actor('you', { x: ME[0], y: ME[1], face: [ME[0], 10], extra: BL, light: [1.05, 1.1, 1.15] });
        // grua entrando por trás de você até o gol
        const e = easeIO(u / (dur - 50));
        const [sx, sy] = shake(0.006);
        K.cam(mix([86.75, 1.42, 19.9], [86.5, 1.02, 18.35], e).map((v, i) => v + (i === 0 ? sx : i === 1 ? sy : 0)), [86, 0.62, 11.4], lerp(42, 36, e));
      } else if (phase === 1) {
        const s = t < 140 ? SHOTS[0] : SHOTS[1];
        const imp = SHOTS[1].hit + 2;
        const saves = 6 + (t >= SHOTS[0].hit ? 1 : 0) + (t >= SHOTS[1].hit ? 1 : 0);
        whiteRoom(K, { goal: true, t, screen: { title: 'DEFESAS: ' + String(saves).padStart(2, '0'), sub: 'GOLS: 00 • LEITURA 99,8%', rgb: t >= SHOTS[0].hit ? '220,38,38' : '14,165,233' } });
        chamberGoal(K);
        // o robô: parado → mergulho até a bola → no chão → reinicia
        let hand = null;
        const diving = t >= s.k - 2 && t < (s === SHOTS[0] ? 96 : 400);
        if (diving) {
          const e = ease(seg(t, s.k - 2, s.hit));
          const x = lerp(ROB[0], s.tgt[0] - s.dir * 0.34, e);
          const fall = t > s.hit + 6 ? ease(seg(t, s.hit + 6, s.hit + 22)) : 0;
          const z = Math.max(0, lerp(0, s.tgt[2] - 0.42, e) * (1 - fall));
          robot(K, t, { dive: true, dir: s.dir, x, y: ROB[1] + 0.1, z });
          hand = [x + s.dir * 0.34, ROB[1] + 0.05, z + 0.42];
        } else if (s === SHOTS[0] && t >= 96 && t < 150) robot(K, t, { rv: Math.max(0.001, seg(t, 96, 112)) });
        else robot(K, t);
        // a bola
        let b = BALL0;
        if (t >= s.k && t < s.hit) {
          const e = seg(t, s.k, s.hit);
          b = bez3(BALL0, [(BALL0[0] + s.tgt[0]) / 2, (BALL0[1] + s.tgt[1]) / 2, s.tgt[2] + 0.45], s.tgt, e);
        } else if (t >= s.hit && hand) b = hand;
        else if (s === SHOTS[0] && t >= 104 && t < 150) {
          const e = easeIO(seg(t, 106, 140));
          b = [lerp(ROB[0], BALL0[0], e), lerp(ROB[1] + 0.4, BALL0[1], e), 0.05];
        }
        if (!(s === SHOTS[0] && t >= 96 && t < 106)) K.ball(b[0], b[1], b[2]);
        const st = t >= s.w0 && t < s.k ? 'windup' : t >= s.k && t < s.k + 18 ? 'shoot' : 'idle';
        K.actor('you', { x: ME[0], y: ME[1], face: [ME[0], 10], anim: st, frame: st === 'idle' ? undefined : 1, extra: BL, light: [1.05, 1.1, 1.15] });
        if (t >= imp && t < imp + 14) {
          // o quadro de impacto: a máquina voando no ângulo, a bola presa nas mãos
          K.cam([88.25, 0.5, 13.0], [86.9, 0.78, 11.15], 38);
        } else {
          const after = t >= imp + 14 ? 1 - seg(t, imp + 14, imp + 40) : 0;
          const e = easeIO(t / 300);
          const [sx, sy] = shake(0.01 + after * 0.06);
          K.cam([lerp(86.85, 86.6, e) + sx, 0.92 + sy, lerp(18.75, 18.35, e)], [lerp(86.1, 86.3, e), 0.6, 11.3], 38);
        }
      } else if (phase === 2) {
        whiteRoom(K, { goal: true, t, screen: { title: 'DEFESAS: ' + String(Math.floor(lerp(9, 63, easeIn(seg(t, 130, 260))))).padStart(2, '0'), sub: 'GOLS: 00 • PADRÃO: LIDO', rgb: '220,38,38' } });
        chamberGoal(K);
        robot(K, t, { light: t < 70 ? [0.85, 1.05, 1.2] : undefined });
        if (t < 70) {
          // contra-plongée: a máquina no gol, vista do chão
          K.actor('you', { x: ME[0], y: ME[1], face: [ME[0], 10], extra: BL });
          K.ball(86.5, 12.4, 0.05);
          const e = easeIO(t / 70);
          K.cam([lerp(86.3, 86.15, e), 0.28, lerp(13.6, 13.25, e)], [86, 0.92, 11.45], 40);
        } else {
          // você no chão (TUM!), a bola rolando para longe; levanta devagar
          const lt = t - 70;
          const rise = ease(seg(lt, 120, 200));
          if (lt < 120) K.actor('you', { x: ME[0], y: ME[1], z: -0.14, ang: 0, anim: 'dive', frame: 1, extra: BL, light: [1.0, 1.05, 1.12], shadow: 0 });
          else K.actor('you', { x: ME[0], y: ME[1], z: lerp(-0.34, -0.12, rise), face: [ME[0], 10], extra: BL, light: [1.0, 1.05, 1.12] });
          const bk = ease(seg(lt, 0, 90));
          K.ball(lerp(86.3, 88.4, bk), lerp(16.4, 17.6, bk), 0.05);
          const e = easeIO(lt / 230);
          K.cam([lerp(84.6, 84.75, e), 0.42, lerp(19.4, 19.2, e)], [lerp(87.4, 87.3, e), 0.35, 15.6], 44);
        }
      } else if (phase === 3) {
        const click = 150;
        const dk = seg(t, click - 10, click + 20);
        whiteRoom(K, { goal: true, t, amb: K.mix([0.94, 0.96, 0.98], [0.3, 0.42, 0.55], dk), screen: { title: 'DEFESAS: 63', sub: 'GOLS: 00', rgb: '220,38,38' } });
        chamberGoal(K);
        robot(K, t);
        K.expo(lerp(0.95, 0.62, dk));
        K.actor('you', { x: ME[0], y: ME[1], face: [ME[0], 10], extra: BL, light: t >= click ? K.mix([1.0, 1.05, 1.12], [0.9, 1.45, 1.5], seg(t, click, click + 16)) : [1.0, 1.05, 1.12] });
        // a bola volta rolando até os seus pés
        const e = ease(seg(t, 56, 140));
        K.ball(lerp(86.6, 86.2, e), lerp(13.0, 16.15, e), 0.05);
        const k = easeIO(t / 300);
        const n = K.noise(t * 0.5, 2) * 0.01;
        const kick = t >= click ? 0.12 * (1 - ease(seg(t, click, click + 20))) : 0;
        K.cam([lerp(86.5, 86.4, k) + n, 0.72, lerp(14.2, 14.5, k) + kick], [lerp(85.95, 85.9, k), 0.52, ME[1]], 32);
      } else {
        const kick = 42;
        const hit = 60;
        const tgt = [85.1, 11.1, 0.86];
        const won = t >= hit + 16;
        const g = seg(t, hit + 16, hit + 60);
        whiteRoom(K, {
          goal: true, t, tint: won ? K.mix([1, 1, 1], [0.78, 0.98, 0.84], g) : '#ffffff', fog: won ? '#d5f0de' : undefined,
          screen: won ? { title: 'DERROTADO', sub: 'GOLS: 01 • FASE 1 CONCLUÍDA', rgb: '22,163,74' } : { title: 'DEFESAS: 63', sub: 'GOLS: 00', rgb: '220,38,38' }
        });
        chamberGoal(K, won);
        // o robô: atrasado, mergulha para o lado errado e cai
        if (t < kick + 8) robot(K, t);
        else {
          const e = ease(seg(t, kick + 8, hit + 24));
          const fall = ease(seg(t, hit + 24, hit + 40));
          robot(K, t, { dive: true, dir: 1, x: lerp(ROB[0], 86.95, e), y: ROB[1] + 0.1, z: Math.max(0, lerp(0, 0.32, e) * (1 - fall)) });
        }
        // a bola: rola de volta → de primeira → no ângulo → cai na rede
        let b;
        if (t < kick) {
          const e = easeIO(seg(t, 0, kick));
          b = [lerp(ROB[0], BALL0[0], e), lerp(ROB[1] + 0.4, BALL0[1], e), 0.05];
        } else if (t < hit) b = bez3(BALL0, [(BALL0[0] + tgt[0]) / 2 - 0.3, 13.5, 1.25], tgt, seg(t, kick, hit));
        else {
          const d = ease(seg(t, hit + 16, hit + 40));
          b = [lerp(tgt[0], 85.4, d), lerp(10.5, 10.45, d), lerp(tgt[2], 0.06, d)];
        }
        K.ball(b[0], b[1], b[2], t >= kick && t < hit ? { glow: true } : {});
        const st = t >= kick - 6 && t < kick ? 'windup' : t >= kick && t < kick + 30 ? 'shoot' : 'idle';
        K.actor('you', { x: ME[0], y: ME[1], face: [ME[0], 10], anim: st, frame: st === 'idle' ? undefined : 1, extra: BL, light: won ? [0.95, 1.25, 1.0] : [1.05, 1.1, 1.15] });
        if (t >= hit && t < hit + 16) {
          // o quadro de impacto: de dentro do gol, a bola rasgando o ângulo
          K.cam([84.15, 0.55, 12.35], [85.6, 0.72, 10.9], 40);
        } else if (!won) {
          const [sx, sy] = shake(0.01);
          K.cam([86.85 + sx, 0.9 + sy, 18.7], [86.15, 0.6, 11.3], 38);
        } else {
          // a câmara fica verde: a câmera gira devagar em volta de você
          const e = easeIO(seg(t, hit + 16, 330));
          const after = 1 - seg(t, hit + 16, hit + 46);
          const [sx, sy] = shake(0.008 + after * 0.05);
          const a = lerp(0.35, -0.55, e);
          K.cam([ME[0] + Math.sin(a) * 2.6 + sx, lerp(1.0, 1.15, e) + sy, ME[1] + Math.cos(a) * 2.6], [lerp(85.9, 86.0, e), 0.55, lerp(14.5, 13.0, e)], 44);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.sselCast();
      if (phase === 0) {
        const intro = 50;
        if (t < intro) {
          introCard(ctx, S, t, intro, { kicker: 'BLUE LOCK • 2ª SELEÇÃO', stamp: 'FASE 1', sub: 'VOCÊ  x  A MÁQUINA' });
          CE.cineSfx(S, 8, 'abre', () => window.SFX?.whoosh?.());
          return;
        }
        const u = t - intro;
        const talk = seg(u, 0, 8) * (1 - seg(u, 200, 214));
        const p = scr(K, ROB[0], 1.12, ROB[1]);
        CE.mgmHoloTag(ctx, p.x, p.y, 'BLUE LOCK MAN', '0,170,160', seg(u, 150, 186), u);
        CE.cineDust(ctx, W, H, t, 26, 'rgba(56,189,248,0.5)', 5);
        CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • 2ª SELEÇÃO • CÂMARA 01', seg(u, 8, 50), '#0ea5e9');
        CE.finKicker(ctx, 40, top + 58, 'UM GOLEIRO QUE LÊ COMO OS MELHORES DO MUNDO', seg(u, 50, 120), '#0f766e');
        CE.sselVoice(ctx, W - 340, bot - 92, t, talk, 'VOZ • JINPACHI EGO');
        CE.cineFlash(ctx, W, H, 1 - seg(t, intro, intro + 26), '#f8fafc');
        CE.cineSfx(S, intro + 40, 'robo', () => window.SFX?.blip?.(140));
        CE.cineSfx(S, intro + 150, 'pronto', () => window.SFX?.blip?.(420));
      } else if (phase === 1) {
        const s = t < 140 ? SHOTS[0] : SHOTS[1];
        const imp = SHOTS[1].hit + 2;
        if (t >= imp && t < imp + 14) {
          const u = t - imp;
          CE.drawRadialSpeedLines(ctx, W * 0.62, H * 0.4, W, '#020617', 0.5);
          CE.sselNeg(ctx, S);
          CE.cineImpactText(ctx, 'DEFENDIDO!', 360, bot - 90, 110, '#ef4444', seg(u, 0, 4), 620, -0.07);
          CE.cineSfx(S, imp, 'impacto', () => window.SFX?.save?.());
          return;
        }
        predict3(ctx, K, BALL0, s.tgt, seg(t, s.w0 + 2, s.w0 + 14) * (1 - seg(t, s.hit + 10, s.hit + 30)), t, 'PREVISÃO 99,8%');
        if (t >= s.k && t < s.hit) {
          const e = seg(t, s.k, s.hit);
          const cc = [(BALL0[0] + s.tgt[0]) / 2, (BALL0[1] + s.tgt[1]) / 2, s.tgt[2] + 0.45];
          const pts = [];
          for (let i = 0; i < 8; i++) pts.push(bez3(BALL0, cc, s.tgt, Math.max(0, e - i * 0.05)));
          streak3(ctx, K, pts, '#38bdf8', 16, 0.8);
        }
        const a = seg(t, SHOTS[0].hit, SHOTS[0].hit + 6) * (1 - seg(t, SHOTS[0].hit + 50, SHOTS[0].hit + 70));
        if (a > 0) CE.cineImpactText(ctx, 'DEFENDIDO!', 960, bot - 120, 64, '#ef4444', seg(t, SHOTS[0].hit, SHOTS[0].hit + 8), 520, -0.08);
        if (t >= imp + 14) CE.rincStamp(ctx, 'LIDO.', 940, top + 120, 70, '#ef4444', t, imp + 30, 3, 0, 'center', 1 - seg(t, 280, 298));
        CE.finKicker(ctx, 40, top + 30, 'TENTATIVA Nº ' + (t < 140 ? 7 : 8), seg(t, 4, 30), '#ef4444');
        SHOTS.forEach((sh, i) => {
          CE.cineSfx(S, sh.k, 'chute' + i, () => window.SFX?.kick?.(0.8));
          CE.cineSfx(S, sh.hit, 'defesa' + i, () => window.SFX?.save?.());
        });
        if (t >= imp + 14) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, imp + 14, imp + 24)), '#e0f2fe');
      } else if (phase === 2) {
        // A: os olhos da máquina (painel de cima)
        const kA = ease(seg(t, 0, 16)) * (1 - seg(t, 62, 74));
        if (kA > 0) {
          const mid = 330;
          eyeStrip(ctx, S, c.robot, kA, {
            y: (top + 14 + mid) / 2, h: mid - top - 14, bg: '#020617', dw: 900, zoom: easeIO(t / 300) * 0.05,
            eyes: { ring: '#00f5d4', iris: '#083344', white: '#a5f3fc', line: '#020617', glow: 'rgba(0,245,212,0.6)', tiny: t > 40, look: t > 40 ? Math.round(Math.sin(t * 0.07) * 1.4) : 0 },
            fx: () => {
              const ey = (top + 14 + mid) / 2;
              ctx.strokeStyle = 'rgba(0,245,212,0.7)';
              ctx.lineWidth = 2;
              [640 - 3.5 * 56, 640 + 3.5 * 56].forEach((x) => {
                ctx.beginPath();
                ctx.arc(x, ey, 86 + Math.sin(t * 0.1) * 5, 0, TAU);
                ctx.stroke();
              });
              const sy = top + ((t * 2.2) % (mid - top));
              ctx.fillStyle = 'rgba(0,245,212,0.12)';
              ctx.fillRect(0, sy, W, 10);
              CE.finFillPat(ctx, 'scan', 0, top, W, mid - top, 0.6);
              ctx.font = '900 15px monospace';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#5eead4';
              ctx.fillText(CE.cineType('> ANALISANDO O ATACANTE...', seg(t, 6, 40)), 50, top + 40);
              ctx.fillText(CE.cineType('> PADRÃO DE CHUTE: LIDO • 100%', seg(t, 30, 64)), 50, mid - 30);
            }
          });
        }
        // B: você no chão
        if (t >= 70) {
          const lt = t - 70;
          const pb = scr(K, 86.6, 0.25, 16.6);
          if (lt < 40) CE.cineImpactText(ctx, 'TUM!', pb.x + 120, pb.y - 120, 56, '#0f172a', seg(lt, 0, 6), 0, -0.1);
          CE.rincStamp(ctx, 'DE NOVO.', 380, top + 70, 44, '#0f172a', lt, 120, 3, 0, 'center');
          CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(lt, 0, 10)), '#ffffff');
        }
        // C: o contador (painel da direita)
        const kC = ease(seg(t, 130, 146));
        if (kC > 0) {
          const mid = top + 30;
          CE.finPanel(ctx, [[818, mid + 4], [W - 20, mid + 12], [W - 20, bot - 14], [802, bot - 14]], () => {
            const lt = t - 130;
            CE.cineGradient(ctx, 780, mid, 520, bot - mid, [[0, '#1a0608'], [1, '#07040a']]);
            const n = Math.floor(lerp(9, 63, easeIn(seg(lt, 0, 130))));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 14px "Segoe UI", sans-serif';
            ctx.fillStyle = '#fca5a5';
            ctx.fillText('T E N T A T I V A S', 1040, mid + 50);
            CE.finPixelText(ctx, String(n).padStart(2, '0'), 1040, mid + 140, 9, '#f8fafc', 'center');
            ctx.font = '900 20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ef4444';
            ctx.fillText('GOLS: 0', 1040, mid + 216);
            for (let i = 0; i < Math.min(30, n - 8); i++) {
              const x = 870 + (i % 10) * 36;
              const y = mid + 262 + Math.floor(i / 10) * 30;
              ctx.strokeStyle = 'rgba(239,68,68,0.85)';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(x - 7, y - 7);
              ctx.lineTo(x + 7, y + 7);
              ctx.moveTo(x + 7, y - 7);
              ctx.lineTo(x - 7, y + 7);
              ctx.stroke();
            }
          }, { dx: (1 - kC) * 520 });
        }
        CE.cineSfx(S, 70, 'tombo', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 130, 'pagina', () => window.SFX?.page?.());
      } else if (phase === 3) {
        const click = 150;
        const sharp = t >= click;
        const pm = scr(K, ME[0], 0.62, ME[1]);
        if (sharp) CE.foxcRays(ctx, pm.x, pm.y, 0, 900, 48, '#67e8f9', 0.16 * seg(t, click, click + 10), (t - click) * 0.004, 0.03);
        CE.cineDust(ctx, W, H, t, 24, 'rgba(165,243,252,0.45)', 12);
        CE.rincStamp(ctx, 'A BOLA VOLTA...', 1000, top + 60, 30, '#0f172a', t, 70, 2, 0, 'center', 1 - seg(t, click - 6, click + 4));
        if (sharp) {
          const u = t - click;
          // os seus olhos ficam afiados (faixa dos olhos)
          const eye = c.you.eyeColor || '#ef4444';
          eyeStrip(ctx, S, c.you, seg(u, 0, 14), {
            x0: 20, x1: 700, y: top + 112, h: 170, dw: 640, bg: '#020a18', border: '#99f6e4',
            band: { dim: 0.15, dimTint: '2,10,24' },
            eyes: { ring: '#5eead4', iris: '#083344', tiny: true, angry: u > 30, glow: 'rgba(0,245,212,0.5)', glowA: seg(u, 0, 20), lid: CE.finShade(c.you.skinColor || '#f3d1b8', -0.18) }
          });
          void eye;
          CE.rincStamp(ctx, 'SEM DOMINAR.', 1000, top + 110, 46, '#f8fafc', u, 8, 2, 520);
          CE.rincStamp(ctx, 'SEM AVISO.', 1000, top + 180, 46, '#f8fafc', u, 34, 2, 520);
          CE.cineImpactText(ctx, 'CHUTE DIRETO.', 990, bot - 110, 70, YOU_C, seg(u, 66, 76), 540, -0.05);
          CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 0, 10)), '#a5f3fc');
        }
        CE.cineSfx(S, click, 'clique', () => window.SFX?.kick?.(0.6));
      } else {
        const kick = 42;
        const hit = 60;
        const tgt = [85.1, 11.1, 0.86];
        if (t >= hit && t < hit + 16) {
          const u = t - hit;
          CE.drawRadialSpeedLines(ctx, W * 0.5, H * 0.42, W, '#020617', 0.55);
          CE.sselNeg(ctx, S);
          CE.cineImpactText(ctx, 'GOL!', 760, bot - 96, 140, '#22c55e', seg(u, 0, 4), 0, -0.08);
          CE.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
          return;
        }
        const won = t >= hit + 16;
        predict3(ctx, K, BALL0, [87.3, 11.4, 0.4], seg(t, kick + 8, kick + 20) * (1 - seg(t, hit + 30, hit + 50)), t, 'ERRO • SEM PADRÃO', '239,68,68');
        if (t >= kick && t < hit) {
          const e = seg(t, kick, hit);
          const cc = [(BALL0[0] + tgt[0]) / 2 - 0.3, 13.5, 1.25];
          const pts = [];
          for (let i = 0; i < 8; i++) pts.push(bez3(BALL0, cc, tgt, Math.max(0, e - i * 0.05)));
          streak3(ctx, K, pts, '#00f5d4', 18, 0.9);
        }
        if (won) {
          CE.cineDust(ctx, W, H, t, 30, 'rgba(34,197,94,0.6)', 9);
          CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit + 16, hit + 28)), '#dcfce7');
          const tk = seg(t, 210, 246);
          if (tk > 0) {
            CE.foxcGrad(ctx, 0, bot - 260, W, 260, [[0, 'rgba(2,6,23,0)'], [0.4, `rgba(2,6,23,${0.8 * tk})`], [1, `rgba(2,6,23,${0.9 * tk})`]]);
            CE.cineTitleCard(ctx, W, bot - 106, tk, { kicker: '2ª SELEÇÃO • FASE 1', title: 'APROVADO', sub: 'O que a máquina não lê, a máquina não defende.', color: '#22c55e' });
          }
        } else CE.finKicker(ctx, 40, top + 30, 'TENTATIVA Nº 64', seg(t, 4, 30), '#ef4444');
        CE.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
        CE.cineSfx(S, 210, 'aprovado', () => window.SFX?.blip?.(660));
      }
    }
  });

  // ==========================================================================
  // 2. O RIN LEVA O BACHIRA (a sala branca do 3x3). v = 'lose' | 'win'
  // ==========================================================================
  const T3 = { rin: [86, 12.9], aryu: [84.5, 13.3], toki: [87.5, 13.3] };
  const TRIO = { nagi: [84.8, 17.4], you: [86, 17.7], bachira: [87.2, 17.5] };
  // a sombra comprida do Rin (o boneco dele pintado de escuro, deitado no chão)
  const RIN_SHADOW = lazy(() => {
    const e = CE.finSprEntry(CE.cineChar('rin', TEAL), 72, { tint: '#0f172a' });
    return mkCv(72, 63, (g) => g.drawImage(e.cv, e.pad, e.pad, 72, 63, 0, 0, 72, 63));
  });
  const DIM = [0.78, 0.82, 0.92];
  function rtbScene(v) {
    const win = v === 'win';
    return function (K, S) {
      const { t, phase, dur } = S;
      K.expo(0.95);
      const n = (a, s = 1) => K.noise(S.f * 0.8, s) * a;
      const room = (o) => whiteRoom(K, Object.assign({ t }, o));
      const result = { kick: 'FIM DE JOGO', title: win ? 'VENCEDOR: SEU TIME' : 'VENCEDOR: TIME RIN', sub: win ? 'PELA REGRA, O VENCEDOR ESCOLHE UM JOGADOR' : 'O VENCEDOR ESCOLHE UM JOGADOR DO PERDEDOR', rgb: win ? '21,128,61' : '15,118,110' };
      // o Top 3 lá na frente (ajoelhados na vitória) e vocês três (ajoelhados na derrota)
      const top3 = (o = {}) => {
        const kz = win ? -0.22 : 0;
        K.actor('aryu', { x: T3.aryu[0], y: T3.aryu[1], z: kz, face: [86, 18], extra: TEAL, light: o.light });
        K.actor('tokimitsu', { x: T3.toki[0], y: T3.toki[1], z: kz, face: [86, 18], extra: TEAL, light: o.light });
        K.actor('rin', { x: T3.rin[0], y: T3.rin[1], face: [86, 18], extra: TEAL, light: o.rinLight || [1.0, 1.2, 1.3] });
      };
      const trio = (pos, o = {}) => {
        const kz = win ? 0 : -0.22;
        K.actor('nagi', { x: pos.nagi[0], y: pos.nagi[1], z: kz, face: o.face || [86, 12], extra: BL, light: DIM });
        K.actor('you', { x: pos.you[0], y: pos.you[1], z: kz, face: o.face || [86, 12], extra: BL, light: DIM });
        if (pos.bachira) K.actor('bachira', { x: pos.bachira[0], y: pos.bachira[1], z: kz, face: o.face || [86, 12], extra: BL, light: DIM });
      };
      if (phase === 0) {
        room({ screen: result });
        top3();
        trio(TRIO);
        const u = Math.max(0, t - 44);
        const e = easeIO(u / (dur - 44));
        K.cam([86 + n(0.006), lerp(1.08, 0.98, e) + n(0.004, 3), lerp(20.7, 19.75, e)], [86, 0.6, 12.9], lerp(46, 40, e));
      } else if (phase === 1) {
        const cut = 160;
        if (t < cut) {
          // o Rin visto de baixo, frio; as luzes do teto atrás dele
          room({ screen: result, amb: '#dbe4ee' });
          top3({ rinLight: [0.85, 1.05, 1.15] });
          const e = easeIO(t / cut);
          K.cam([lerp(86.6, 86.5, e), lerp(0.22, 0.26, e), lerp(14.75, 14.5, e)], [85.75, 0.72, 12.9], 38);
        } else {
          // de cima: vocês três pequenos no chão branco; a sombra dele entrando por baixo
          const u = t - cut;
          const sk = ease(seg(u, 10, 70));
          room({ screen: result });
          const pos = { nagi: [85.0, 16.3], you: [86, 16.6], bachira: [87.0, 16.35] };
          trio(pos, { face: [86, 22] });
          const L = lerp(1.6, 5.4, sk);
          K.floor({ x0: 84.7, y0: 21.3 - L, x1: 87.3, y1: 21.3, z: 0.015, img: RIN_SHADOW(), color: '#ffffff', alpha: 0.55 * sk });
          const e = easeIO(u / (dur - cut));
          K.cam([86 + n(0.005), 2.36, lerp(19.4, 19.1, e)], [lerp(86.15, 86.0, e), 0, 16.0], lerp(52, 48, e));
        }
      } else if (phase === 2) {
        // a escolha: os dois do lado de lá enquadrando, os cartões no overlay
        room({ screen: result });
        const lock = win ? 190 : 156;
        if (!win) {
          K.actor('aryu', { x: 84.9, y: 14.5, face: [86, 18], anim: t > lock ? 'call_pass' : 'idle', frame: t > lock ? 1 : undefined, extra: TEAL, light: [1.05, 0.98, 1.15] });
          K.actor('tokimitsu', { x: 87.1, y: 14.5, face: [86, 18], extra: TEAL, light: [1.0, 1.08, 0.95] });
          K.actor('rin', { x: 86.05, y: 12.7, face: [86, 18], extra: TEAL, light: [0.9, 1.1, 1.2] });
        } else {
          K.actor('rin', { x: 84.9, y: 14.4, face: [86, 18], extra: TEAL, light: [0.85, 1.0, 1.1] });
          K.actor('bachira', { x: 87.1, y: 14.9, face: [86, 18], anim: t > lock - 20 ? 'call_pass' : 'idle', frame: t > lock - 20 ? 1 : undefined, extra: BL, light: [1.2, 1.12, 0.92] });
          K.actor('aryu', { x: 84.6, y: 12.6, z: -0.22, face: [86, 18], extra: TEAL, light: DIM });
          K.actor('tokimitsu', { x: 87.5, y: 12.6, z: -0.22, face: [86, 18], extra: TEAL, light: DIM });
        }
        const e = easeIO(t / dur);
        K.cam([86 + n(0.006), 0.82 + n(0.004, 2), lerp(17.4, 17.05, e)], [86, 0.6, 13.4], 44);
      } else if (phase === 3) {
        // o Bachira: olha para você... e sorri
        const turn = 210;
        room({ screen: result, amb: '#e8e2cf' });
        K.expo(0.86);
        // (o ponto de vista é o seu: ele olha para a câmera)
        K.actor('rin', { x: 86.9, y: 12.8, face: [86, 18], extra: TEAL, light: [0.55, 0.75, 0.85] });
        const lk = t >= turn ? K.mix([1.15, 1.1, 0.95], [1.4, 1.28, 0.85], seg(t, turn, turn + 30)) : [1.15, 1.1, 0.95];
        K.actor('bachira', { x: 86.4, y: 16.35, face: t < 100 ? [85.6, 18.3] : [85.1, 18.5], extra: BL, light: lk });
        const e = easeIO(t / dur);
        K.cam([lerp(85.4, 85.55, e) + n(0.006), 0.74 + n(0.004, 4), lerp(18.75, 18.4, e)], [86.95, 0.56, 16.6], lerp(34, 31, e));
      } else {
        const cut = 250;
        if (t < cut) {
          // ele vai embora pela porta do fundo; você e o Nagi ficam
          const open = seg(t, 10, 40) * (1 - seg(t, 214, 240));
          room({ screen: { kick: 'FIM DE JOGO', title: 'BACHIRA → TIME RIN', sub: 'TRANSFERÊNCIA CONCLUÍDA', rgb: '161,98,7' }, door: open });
          const gone = seg(t, 196, 222);
          if (gone < 1) {
            const back = t > 180;
            const f = back ? [86, 8] : [86, 18];
            K.actor('aryu', { x: 85.45, y: 10.5, face: f, extra: TEAL, alpha: 1 - gone });
            K.actor('tokimitsu', { x: 86.65, y: 10.5, face: f, extra: TEAL, alpha: 1 - gone });
            K.actor('rin', { x: 86.05, y: 10.25, face: f, extra: TEAL, alpha: 1 - gone, light: [0.95, 1.15, 1.25] });
          }
          const wk = easeIO(seg(t, 0, 200));
          const wave = t > 96 && t < 150;
          const bg = seg(t, 200, 222);
          if (bg < 1) K.actor('bachira', { x: lerp(86.7, 86.1, wk), y: lerp(16.2, 10.9, wk), face: [86.05, 9], anim: wave ? 'call_pass' : wk < 1 ? 'run' : 'idle', frame: wave ? 1 : wk < 1 ? Math.floor(S.f / 6) : undefined, extra: BL, alpha: 1 - bg, light: [1.2, 1.12, 0.95] });
          K.actor('you', { x: 85.2, y: 18.4, face: [86, 9], extra: BL, light: [0.8, 0.88, 0.95] });
          K.actor('nagi', { x: 86.95, y: 18.5, face: [86, 9], extra: BL, light: [0.8, 0.84, 0.92] });
          const e = easeIO(t / cut);
          K.cam([86.05 + n(0.006), lerp(0.98, 0.92, e), lerp(20.45, 20.05, e)], [86.05, 0.55, 11], lerp(36, 44, e));
        } else {
          // os seus olhos: o juramento
          room({ screen: { kick: 'FIM DE JOGO', title: 'BACHIRA → TIME RIN', sub: 'TRANSFERÊNCIA CONCLUÍDA', rgb: '161,98,7' }, door: 0, amb: '#9fb0c4' });
          K.expo(0.55);
          K.actor('you', { x: 85.2, y: 18.4, face: [85.3, 15], extra: BL, light: [0.9, 1.25, 1.3] });
          K.actor('nagi', { x: 86.95, y: 18.5, face: [86, 9], extra: BL, light: DIM });
          const u = t - cut;
          K.cam([85.35, 0.7, lerp(16.4, 16.6, easeIO(u / 90))], [85.2, 0.62, 18.4], 30);
        }
      }
    };
  }
  function rtbOverlay(v) {
    const win = v === 'win';
    return function (ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.sselCast();
      if (phase === 0) {
        const intro = 44;
        if (t < intro) {
          introCard(ctx, S, t, intro, { kicker: '2ª SELEÇÃO • 3 x 3 CONTRA O TOP 3', stamp: 'FIM DE JOGO', size: 92, kickY: 70, stampY: 4, t0: 6, step: 2, glow: win ? 'rgba(34,197,94,0.16)' : 'rgba(34,211,238,0.16)' });
          CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
          return;
        }
        const u = t - intro;
        CE.cineDust(ctx, W, H, u, 26, 'rgba(56,189,248,0.45)', 3);
        CE.finKicker(ctx, 40, top + 30, '2ª SELEÇÃO • 3 x 3 CONTRA O TOP 3', seg(u, 8, 50), '#0ea5e9');
        CE.finKicker(ctx, 40, top + 58, win ? 'O TOP 3 CAIU' : 'O VENCEDOR ESCOLHE QUEM LEVA', seg(u, 40, 90), win ? '#16a34a' : '#0f766e');
        CE.cineFlash(ctx, W, H, 1 - seg(u, 0, 24), '#f8fafc');
      } else if (phase === 1) {
        const cut = 160;
        if (t < cut) {
          CE.finKicker(ctx, 40, bot - 30, 'RIN ITOSHI • TOP 1 DO BLUE LOCK', seg(t, 10, 50), '#0f766e');
          const ke = seg(t, 50, 66) * (1 - seg(t, 146, 160));
          eyeStrip(ctx, S, c.rin, ke, {
            x0: 640, x1: W - 20, y: top + 78, h: 128, dw: 560, bg: '#02080b', border: '#a5f3fc', dir: 1,
            eyes: { ring: '#5eead4', iris: '#0f766e', half: true, lid: CE.finShade(c.rin.skinColor, -0.3), glow: 'rgba(34,211,238,0.35)', glowA: seg(t, 60, 100) }
          });
          return;
        }
        const u = t - cut;
        CE.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.12 * ease(seg(u, 10, 70)));
        CE.rincStamp(ctx, win ? 'NÃO MUDA NADA.' : 'LENTOS DEMAIS.', 640, top + 70, 52, '#0f172a', u, 60, 3, W * 0.7);
        CE.cineSfx(S, cut, 'corte', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const lock = win ? 190 : 156;
        CE.cineBokeh(ctx, W, top, bot, t, 12, ['rgba(255,255,255,0.35)', 'rgba(125,211,252,0.3)'], 4);
        const list = win
          ? [[c.rin, 'RIN ITOSHI', '15,118,110'], [c.aryu, 'JYUBEI ARYU', '126,34,206'], [c.toki, 'AOSHI TOKIMITSU', '77,124,15']]
          : [[c.you, CE.cinePlayerName(), '0,170,160'], [c.nagi, 'SEISHIRO NAGI', '71,85,105'], [c.bachira, 'MEGURU BACHIRA', '202,138,4']];
        const cx0 = win ? 370 : 470;
        const cy = bot - 150;
        const cur = t < lock ? Math.floor(t / 22) % 3 : win ? -1 : 2;
        list.forEach(([ch, nm, rgb], i) => {
          const sel = i === cur ? (t < lock ? 0.6 : 1) : 0;
          CE.sselCard(ctx, cx0 + i * 170, cy, 140, 186, ch, nm, rgb, seg(t, 10 + i * 8, 30 + i * 8), sel, t >= lock && i !== cur ? 1 : 0, !win && t >= lock ? 'ESCOLHIDO' : '');
        });
        if (win) {
          const kb = seg(t, lock, lock + 16);
          CE.sselCard(ctx, cx0 + 3 * 170, cy - 10, 150, 200, c.bachira, 'MEGURU BACHIRA', '202,138,4', kb, kb, 0, 'PEDIU PARA IR');
        }
        CE.finKicker(ctx, 40, top + 30, win ? 'VOCÊS VENCERAM • VOCÊS ESCOLHEM' : 'O TOP 3 ESCOLHE', seg(t, 6, 40), win ? '#16a34a' : '#7c3aed');
        CE.cineSfx(S, lock, 'trava', () => window.SFX?.blip?.(520));
        for (let i = 0; i < 7; i++) CE.cineSfx(S, i * 22, 'cur' + i, () => window.SFX?.blip?.(300));
      } else if (phase === 3) {
        const turn = 210;
        // os olhos dele (amarelos, a pupila fecha no sorriso)
        const grin = t >= turn;
        const ke = seg(t, turn - 14, turn) * (1 - seg(t, 326, 340));
        eyeStrip(ctx, S, c.bachira, ke, {
          x0: 20, x1: 760, y: bot - 100, h: 170, dw: 700, bg: '#120d02', border: '#fde68a', glow: 'rgba(250,204,21,0.25)', vert: true, dir: 1,
          band: { dim: 0.1, dimTint: '40,30,0' },
          eyes: { ring: '#eab308', iris: '#713f12', look: -1, shine: grin ? 1 : 0.5, tiny: grin && t < turn + 40, glow: 'rgba(250,204,21,0.4)', glowA: seg(t, turn, turn + 30) }
        });
        // painel: o monstro dele olhando para o abismo do Rin
        const kp = ease(seg(t, 140, 158));
        if (kp > 0) {
          CE.finPanel(ctx, [[812, top + 18], [W - 22, top + 12], [W - 22, bot - 18], [790, bot - 12]], () => {
            const lt = t - 140;
            CE.cineGradient(ctx, 780, top, 520, bot - top, [[0, '#020617'], [1, '#04161a']]);
            CE.drawRinAbyss(ctx, 1150, bot - 40, 0.75, t, 1);
            CE.finRim(ctx, c.rin, 1150, bot + 90, 400, { facing: 'back', dim: 0.6, dimTint: '0,20,24' }, '#22d3ee', [-1, 1], 3);
            CE.sselMonster(ctx, 930, top + 230, 120, t, ease(seg(lt, 10, 40)));
            CE.rincStamp(ctx, 'É ELE.', 960, bot - 60, 50, '#fde68a', lt, 50, 4);
            CE.finFillPat(ctx, 'dots', 780, top, 520, bot - top, 0.16);
          }, { dx: (1 - kp) * 520, border: '#fde68a' });
        }
        CE.cineSfx(S, turn, 'sorriso', () => window.SFX?.whoosh?.());
      } else {
        const cut = 250;
        if (t < cut) {
          CE.finKicker(ctx, 40, top + 30, 'A SALA BRANCA • DOIS QUE FICARAM', seg(t, 20, 60), '#0ea5e9');
          CE.cineSfx(S, 230, 'porta', () => window.SFX?.tackle?.());
          return;
        }
        const u = t - cut;
        const eye = c.you.eyeColor || '#ef4444';
        eyeStrip(ctx, S, c.you, 1, {
          h: 300, dw: 1180, bg: '#020409', border: '#020617', zoom: easeIO(u / 90) * 0.05,
          band: { dim: 0.25, dimTint: '2,8,20' },
          eyes: { ring: eye, iris: CE.finShade(eye, -0.6), angry: true, glow: 'rgba(0,245,212,0.35)', glowA: seg(u, 10, 40), shine: 1 }
        });
        CE.cineImpactText(ctx, 'EU VOU TE BUSCAR.', 640, bot - 70, 72, YOU_C, seg(u, 14, 24), W * 0.86, -0.03);
        if (u >= 14) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 14, 26)), '#ccfbf1');
        CE.cineSfx(S, cut + 14, 'jura', () => window.SFX?.kick?.(1));
      }
    };
  }

  CE.registerCine3D('rin_takes_bachira', {
    phases: [300, 320, 330, 340, 340],
    music: 'mystery',
    title: '🐝 O MONSTRO FOI EMBORA',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • DE CIMA', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • DOIS QUE FICARAM'],
    subs: [
      [{ from: 20, to: 296, who: 'NARRADOR', text: 'Fim de jogo. O Top 3 venceu.', color: NARR_C }],
      [{ from: 30, to: 316, who: 'RIN ITOSHI', text: '"Lentos demais. Vocês nem chegaram perto."', color: RIN_C }],
      [
        { from: 12, to: 182, who: 'AOSHI TOKIMITSU', text: '"A-a gente já decidiu..."', color: TOKI_C },
        { from: 184, to: 328, who: 'JYUBEI ARYU', text: '"O Bachira. OSHAA!"', color: ARYU_C }
      ],
      [
        { from: 8, to: 104, who: 'VOCÊ', text: '"...Bachira?"', color: YOU_C },
        { from: 106, to: 338, who: 'BACHIRA', text: '"Desculpa... o monstro dele é mais forte."', color: BACH_C }
      ],
      [
        { from: 16, to: 176, who: 'SEISHIRO NAGI', text: '"...Ele foi mesmo."', color: NAGI_C },
        { from: 180, to: 338, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.5,
    theme: 'bluelock_holo',
    scene: rtbScene('lose'),
    overlay: rtbOverlay('lose')
  });

  CE.registerCine3D('rin_takes_bachira_win', {
    phases: [300, 320, 330, 340, 340],
    music: 'mystery',
    title: '🐝 O MONSTRO ESCOLHEU',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • NÃO MUDA NADA', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • DOIS QUE FICARAM'],
    subs: [
      [{ from: 20, to: 296, who: 'NARRADOR', text: 'Fim de jogo. Vocês derrubaram o Top 3.', color: NARR_C }],
      [{ from: 30, to: 316, who: 'RIN ITOSHI', text: '"Ganhou hoje. Não muda nada."', color: RIN_C }],
      [
        { from: 10, to: 204, who: 'NARRADOR', text: 'Pela regra, vocês podem levar um deles.', color: NARR_C },
        { from: 206, to: 328, who: 'BACHIRA', text: '"Eu vou com o Rin."', color: BACH_C }
      ],
      [
        { from: 6, to: 88, who: 'VOCÊ', text: '"Bachira?"', color: YOU_C },
        { from: 90, to: 338, who: 'BACHIRA', text: '"O monstro dele é mais forte... eu quero jogar com ele."', color: BACH_C }
      ],
      [
        { from: 10, to: 190, who: 'SEISHIRO NAGI', text: '"A gente ganhou... e ele foi."', color: NAGI_C },
        { from: 192, to: 338, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.5,
    theme: 'bluelock_holo',
    scene: rtbScene('win'),
    overlay: rtbOverlay('win')
  });

  // ==========================================================================
  // 3. DEVORANDO O REI — 5x5 no campo do prédio (o seu time ataca o gol do norte)
  // ==========================================================================
  const GN = [53, 6.6]; // o gol do time do Rin
  const crownSpr = (K, x, y, z, o = {}) => K.sprite(CE.sselCrownCv(), { x, y, z, w: 0.3, h: 0.22, light: o.light || [1.3, 1.2, 0.9], alpha: o.alpha });
  // a metavisão: a rota do Rei e a sua (no chão do campo, vista de cima)
  const MV = {
    R0: [55.6, 14.2], RC: [52.4, 13.0], R1: [51.3, 9.0],
    Y0: [57.4, 9.9], Y1: [52.3, 8.6],
    rin: [53.2, 7.6], aryu: [50.2, 11.8], toki: [55.0, 10.6], bachira: [49.0, 13.6], nagi: [57.0, 13.8], chigiri: [47.8, 9.0]
  };
  const bez2 = (a, c, b, k) => [lerp(lerp(a[0], c[0], k), lerp(c[0], b[0], k), k), lerp(lerp(a[1], c[1], k), lerp(c[1], b[1], k), k)];
  // o abismo do Rin (o desenho 2D do motor) num canvas guardado, refeito a cada 3 quadros
  const ABYSS = { cv: null, f: -99 };
  function abyss(t, k) {
    if (!ABYSS.cv) ABYSS.cv = mkCv(512, 420);
    const f = Math.floor(t / 3);
    if (f === ABYSS.f) return { cv: ABYSS.cv, dirty: false };
    ABYSS.f = f;
    const g = ABYSS.cv.getContext('2d');
    g.clearRect(0, 0, 512, 420);
    CE.drawRinAbyss(g, 256, 330, 0.62, t, k);
    return { cv: ABYSS.cv, dirty: true };
  }
  // contra-luz do campo à noite (estádio do Blue Lock)
  function pitchNight(K, o = {}) {
    K.sky(o.top || '#020617', o.hor || '#0b1a3a', o.stars ?? 0.6);
    K.fog(o.fog || '#060d1f', o.fogK ?? 0.02);
  }

  CE.registerCine3D('barou_devour', {
    phases: [260, 280, 290, 280, 300, 230],
    music: 'epic',
    title: '👑 DEVORANDO O REI',
    tags: ['PLANO 1 • A INVESTIDA DO REI', 'PLANO 2 • METAVISÃO', 'PLANO 3 • UM PASSO ANTES', 'PLANO 4 • O GOL ROUBADO', 'PLANO 5 • DE JOELHOS', 'PLANO 6 • VEM PRO MEU TIME'],
    subs: [
      [{ from: 30, to: 258, who: 'SHOUEI BAROU', text: '"Ninguém toca na bola! Esse gol é do Rei!"', color: BAROU_C }],
      [{ from: 20, to: 278, who: 'VOCÊ', text: '(Eu vejo o caminho dele. E o gol que ele vai fazer.)', color: YOU_C }],
      [{ from: 120, to: 290, who: 'SHOUEI BAROU', text: '"...Ele roubou o MEU gol?!"', color: BAROU_C }],
      [{ from: 60, to: 278, who: 'VOCÊ', text: '(O seu gol... agora é meu.)', color: YOU_C }],
      [
        { from: 12, to: 150, who: 'NARRADOR', text: 'O Rei caiu de joelhos.', color: NARR_C },
        { from: 158, to: 298, who: 'VOCÊ', text: '(Eu devorei o Rei.)', color: YOU_C }
      ],
      [{ from: 36, to: 228, who: 'RIN ITOSHI', text: '"Você. Vem pro meu time."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.55,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, dur } = S;
      const n = (a, s = 1) => K.noise(S.f * 0.9, s) * a;
      pitchNight(K);
      K.expo(1.0);
      if (phase === 0) {
        // o Rei vem de frente para a câmera, que recua na frente dele
        const e = easeIn(seg(t, 10, 236));
        const bx = 53 + Math.sin(t * 0.03) * 0.5;
        const by = lerp(19.6, 11.2, e);
        const passed = (yy) => by < yy - 0.3;
        K.actor('aryu', { x: 51.4, y: 14.6, face: passed(14.6) ? [bx, by] : [bx, by + 2], anim: passed(14.6) ? 'run' : 'idle', frame: passed(14.6) ? undefined : 0, extra: TEAL });
        K.actor('tokimitsu', { x: 55.0, y: 13.3, face: passed(13.3) ? [bx, by] : [bx, by + 2], anim: passed(13.3) ? 'run' : 'idle', frame: passed(13.3) ? undefined : 0, extra: TEAL });
        K.actor('rin', { x: 53.6, y: 8.2, face: [53, 20], extra: TEAL, frame: 0 });
        K.actor('bachira', { x: 49.4, y: 10.6, face: [53, 20], extra: TEAL, frame: 0 });
        K.actor('barou', { x: bx, y: by, face: [bx, 6], anim: 'run', extra: BL, light: [1.35, 1.0, 0.95] });
        crownSpr(K, bx, by, 0.98 + Math.sin(t * 0.2) * 0.02);
        K.ball(bx + 0.12 + Math.sin(t * 0.4) * 0.05, by - 0.32, 0.05);
        const d = lerp(3.4, 1.55, e);
        K.cam([lerp(53, bx, 0.6) + n(0.01 + e * 0.04), 0.62 + n(0.006 + e * 0.02, 3), by - d], [bx, 0.52, by], lerp(44, 40, e));
      } else if (phase === 1) {
        // a metavisão: o campo visto de cima, holograma tático
        K.expo(0.78);
        K.sky('#01030a', '#04142a', 0.3);
        K.fog('#04142a', 0.02);
        const u = Math.max(0, t - 80);
        const bp = bez2(MV.R0, MV.RC, MV.R1, ease(seg(u, 100, 200)) * 0.82);
        const yp = mix(MV.Y0, MV.Y1, ease(seg(u, 120, 200)));
        const hl = [0.7, 1.15, 1.3];
        K.actor('rin', { x: MV.rin[0], y: MV.rin[1], face: [53, 14], extra: TEAL, frame: 0, light: hl });
        K.actor('aryu', { x: MV.aryu[0], y: MV.aryu[1], face: bp, extra: TEAL, frame: 0, light: hl });
        K.actor('tokimitsu', { x: MV.toki[0], y: MV.toki[1], face: bp, extra: TEAL, frame: 0, light: hl });
        K.actor('bachira', { x: MV.bachira[0], y: MV.bachira[1], face: bp, extra: TEAL, frame: 0, light: hl });
        K.actor('nagi', { x: MV.nagi[0], y: MV.nagi[1], face: [53, 6], extra: BL, frame: 0, light: [0.8, 0.85, 0.95] });
        K.actor('chigiri', { x: MV.chigiri[0], y: MV.chigiri[1], face: [53, 6], extra: BL, frame: 0, light: [0.8, 0.85, 0.95] });
        K.actor('barou', { x: bp[0], y: bp[1], face: MV.R1, anim: u > 100 ? 'run' : 'idle', extra: BL, light: [1.4, 1.2, 0.7] });
        K.ball(bp[0] - 0.15, bp[1] - 0.3, 0.05);
        K.actor('you', { x: yp[0], y: yp[1], face: MV.Y1, anim: u > 120 && u < 200 ? 'run' : 'idle', extra: BL, light: [0.8, 1.5, 1.45] });
        // o anel ciano do "um passo antes"
        const e = easeIO(u / 200);
        K.cam([53 + n(0.01), lerp(5.4, 5.8, e), lerp(16.8, 16.3, e)], [53, 0, lerp(11.6, 11.2, e)], 54);
      } else if (phase === 2) {
        // o Rei arma o chute... você entra pelo ponto cego e chega um passo antes
        const steal = 96;
        const bst = t < 50 ? 'run' : t < steal + 4 ? 'windup' : 'shoot';
        const bxy = t < 50 ? mix([53.1, 11.4], [52.75, 9.45], seg(t, 0, 50)) : [52.75, 9.45];
        K.actor('barou', { x: bxy[0], y: bxy[1], face: [52.8, 6], anim: bst, frame: bst === 'run' ? undefined : 1, extra: BL, light: [1.3, 1.02, 0.95] });
        if (t < steal) crownSpr(K, bxy[0], bxy[1], 0.98);
        else crownSpr(K, bxy[0], bxy[1], 0.98, { light: [0.8, 0.7, 0.5] });
        const yk = t < steal ? easeIn(seg(t, 20, steal)) : 1;
        const yxy = t < steal ? mix([54.6, 14.6], [52.9, 9.35], yk) : mix([52.9, 9.35], [52.75, 9.0], ease(seg(t, steal, steal + 30)));
        const yst = t < steal - 6 ? 'run' : t < steal ? 'windup' : t < steal + 40 ? 'shoot' : 'idle';
        K.actor('you', { x: yxy[0], y: yxy[1], face: [52.8, 6], anim: yst, frame: yst === 'run' ? Math.floor(S.f / 2) : yst === 'idle' ? undefined : 1, extra: BL, light: [0.95, 1.25, 1.25] });
        K.actor('rin', { x: 53.4, y: 7.3, face: [53, 12], extra: TEAL, frame: 0 });
        let b = [bxy[0] - 0.02, bxy[1] - 0.38, 0.05];
        if (t >= steal) {
          const e = seg(t, steal, steal + 22);
          b = [lerp(52.8, 53.55, e), lerp(9.0, 6.35, e), lerp(0.05, 0.78, e)];
        }
        if (t < steal + 22) K.ball(b[0], b[1], b[2], t >= steal ? { glow: true } : {});
        const k = easeIO(t / dur);
        const sh = t >= steal ? 0.06 * (1 - seg(t, steal, steal + 26)) : 0;
        K.cam([lerp(50.2, 50.55, k) + n(0.006 + sh), 0.55 + n(0.004 + sh * 0.6, 2), lerp(10.5, 9.9, k)], [lerp(53.1, 52.85, k), 0.48, lerp(10.0, 9.2, k)], 38);
      } else if (phase === 3) {
        const imp = 26;
        if (t < imp) {
          // a bola rasgando o ângulo: a câmera colada na trave
          K.actor('rin', { x: 53.4, y: 7.6, face: [53.5, 6], extra: TEAL, frame: 0 });
          const e = ease(seg(t, 0, 12));
          K.ball(lerp(53.4, 53.7, e), lerp(7.4, 6.2, e), lerp(0.7, 0.8, e) - ease(seg(t, 12, 26)) * 0.5, { glow: true });
          K.cam([51.35 + n(0.04 * seg(t, 8, 26)), 0.5, 7.45], [53.6, 0.7, 6.4], 46);
        } else if (t < imp + 18) {
          // o quadro de impacto
          K.actor('you', { x: 52.75, y: 9.0, face: [53, 6], anim: 'shoot', frame: 1, extra: BL });
          K.actor('barou', { x: 53.2, y: 9.55, face: [53, 6], anim: 'windup', frame: 1, extra: BL });
          K.cam([51.7, 0.28, 10.9], [52.9, 0.62, 9.0], 42);
        } else {
          // o Rei parado; a coroa racha e cai. Você em primeiro plano, de costas
          const u = t - imp - 18;
          const k = easeIO(u / (dur - imp - 18));
          K.expo(0.88);
          K.actor('barou', { x: 52.95, y: 9.6, face: [52.4, 13], extra: BL, light: [0.95, 0.62, 0.6] });
          const fall = easeIn(seg(u, 100, 124));
          crownSpr(K, 52.95 + fall * 0.35, 9.6, lerp(0.98, 0.04, fall), { light: [1.2, 1.1, 0.85] });
          K.actor('you', { x: 51.95, y: 11.15, face: [52.0, 6], extra: BL, light: [0.8, 1.15, 1.15] });
          K.actor('rin', { x: 54.6, y: 7.4, face: [52, 12], extra: TEAL, frame: 0, light: [0.6, 0.8, 0.85] });
          K.cam([lerp(52.3, 52.4, k) + n(0.006 + 0.05 * (1 - seg(u, 0, 26))), 0.84, lerp(12.65, 12.3, k)], [52.95, 0.56, 9.6], lerp(36, 32, k));
        }
      } else if (phase === 4) {
        const cut = 150;
        if (t < cut) {
          // o Rei de joelhos, a coroa no gramado; você de pé olhando
          K.expo(0.8);
          K.actor('barou', { x: 52.95, y: 9.6, z: -0.24, face: [52.6, 13], extra: BL, light: [0.95, 0.55, 0.5] });
          K.floor({ x0: 53.45, y0: 9.8, x1: 53.75, y1: 10.02, z: 0.012, img: CE.sselCrownCv(), color: '#fde68a' });
          K.actor('you', { x: 52.0, y: 11.1, face: [52.95, 9.6], extra: BL, light: [0.7, 0.95, 1.0] });
          const k = easeIO(t / cut);
          K.cam([lerp(51.55, 51.85, k), lerp(0.84, 0.76, k), lerp(13.7, 13.15, k)], [52.75, 0.38, 9.8], lerp(36, 32, k));
        } else {
          // meio rosto no escuro
          const u = t - cut;
          const k = easeIO(u / (dur - cut));
          K.expo(0.5);
          K.sky('#000000', '#020617', 0.2);
          K.fog('#010205', 0.08);
          K.actor('you', { x: 52.0, y: 11.1, face: [52.6, 13.6], extra: BL, light: [0.45, 1.15, 1.15] });
          K.cam([lerp(52.5, 52.46, k), 0.68, lerp(13.6, 13.35, k)], [51.88, 0.56, 11.1], 30);
        }
      } else {
        // o Rin do outro lado do campo: "Você. Vem pro meu time."
        K.expo(0.85);
        const k = easeIO(t / dur);
        K.actor('aryu', { x: 51.1, y: 8.1, face: [52, 12.6], extra: TEAL, frame: 0, light: [0.6, 0.8, 0.85] });
        K.actor('tokimitsu', { x: 55.8, y: 7.9, face: [52, 12.6], extra: TEAL, frame: 0, light: [0.6, 0.8, 0.85] });
        K.actor('bachira', { x: 54.9, y: 9.0, face: [52, 12.6], extra: TEAL, light: [1.15, 1.08, 0.9] });
        K.actor('rin', { x: 53.5, y: 8.5, face: [52, 12.6], anim: t > 60 ? 'call_pass' : 'idle', frame: t > 60 ? 1 : undefined, extra: TEAL, light: [0.9, 1.2, 1.3] });
        // o abismo do Rin crescendo atrás dele
        const ab = abyss(t, 0.4 + 0.6 * seg(t, 40, 120));
        K.sprite(ab.cv, { x: 53.55, y: 8.05, z: -0.35, w: 2.6, h: 2.1, dirty: ab.dirty, light: [1, 1, 1], alpha: 0.95 });
        K.actor('you', { x: 51.55, y: 13.0, face: [53.5, 8.5], extra: BL, light: [0.65, 0.8, 0.88] });
        K.cam([lerp(51.75, 51.85, k) + n(0.006), 0.95, lerp(14.6, 14.25, k)], [53.3, 0.55, 8.6], lerp(34, 30, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.sselCast();
      if (phase === 0) {
        const e = easeIn(seg(t, 10, 236));
        const bx = 53 + Math.sin(t * 0.03) * 0.5;
        const by = lerp(19.6, 11.2, e);
        const p = scr(K, bx, 0.45, by);
        CE.cineGlow(ctx, p.x, p.y, 220 + e * 260, 'rgba(220,38,38,0.3)');
        CE.drawRadialSpeedLines(ctx, p.x, p.y, W, '#fca5a5', 0.12 + e * 0.3);
        ctx.fillStyle = `rgba(60,0,0,${0.16 * e})`;
        ctx.fillRect(0, 0, W, H);
        CE.finKicker(ctx, 40, bot - 58, '2ª SELEÇÃO • 5 x 5 • O SEU TIME  x  O TIME DO RIN', seg(t, 6, 46), '#38bdf8');
        CE.finKicker(ctx, 40, bot - 30, 'SHOUEI BAROU • O "REI" DO SEU PRÓPRIO TIME', seg(t, 40, 90), '#eab308');
        CE.cineImpactText(ctx, 'ESSE GOL É MEU!', 880, top + 130, 70, '#fde047', seg(t, 190, 202), 680, -0.06);
        CE.cineSfx(S, 190, 'rei', () => window.SFX?.tackle?.());
      } else if (phase === 1) {
        const into = 80;
        const ex = 640;
        const ey = 360;
        const u = t - into;
        if (t >= into) {
          // o holograma tático por cima do campo de verdade
          ctx.save();
          ctx.fillStyle = 'rgba(2,10,24,0.25)';
          ctx.fillRect(0, 0, W, H);
          const g3 = (x, y) => scr(K, x, 0.02, y);
          const rk = seg(u, 30, 100);
          if (rk > 0) {
            ctx.strokeStyle = 'rgba(234,179,8,0.95)';
            ctx.lineWidth = 5;
            ctx.setLineDash([16, 10]);
            ctx.lineDashOffset = -u;
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
              const q = bez2(MV.R0, MV.RC, MV.R1, (i / 24) * rk);
              const p = g3(q[0], q[1]);
              if (i) ctx.lineTo(p.x, p.y);
              else ctx.moveTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            if (rk >= 1) {
              const a = g3(MV.R1[0], MV.R1[1]);
              const b = g3(GN[0], GN[1]);
              ctx.strokeStyle = 'rgba(234,179,8,0.6)';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
          ctx.strokeStyle = 'rgba(148,163,184,0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 8]);
          ctx.globalAlpha = seg(u, 20, 50);
          [[MV.nagi, MV.R0], [MV.chigiri, MV.R0], [MV.Y0, MV.nagi]].forEach(([a, b]) => {
            const pa = g3(a[0], a[1]);
            const pb = g3(b[0], b[1]);
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          });
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          const yk = seg(u, 120, 170);
          if (yk > 0) {
            const a = g3(MV.Y0[0], MV.Y0[1]);
            const bq = mix(MV.Y0, MV.Y1, ease(yk));
            const b = g3(bq[0], bq[1]);
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 7;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            // o anel no chão (projetado)
            const pul = 0.5 + 0.5 * Math.sin(u * 0.2);
            ctx.strokeStyle = `rgba(0,245,212,${0.5 + 0.5 * pul})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = 0; i <= 32; i++) {
              const a2 = (i / 32) * TAU;
              const r = 0.75 + pul * 0.12;
              const p = g3(MV.Y1[0] + Math.cos(a2) * r, MV.Y1[1] + Math.sin(a2) * r);
              if (i) ctx.lineTo(p.x, p.y);
              else ctx.moveTo(p.x, p.y);
            }
            ctx.stroke();
          }
          ctx.restore();
          const bp = bez2(MV.R0, MV.RC, MV.R1, ease(seg(u, 100, 200)) * 0.82);
          const yp = mix(MV.Y0, MV.Y1, ease(seg(u, 120, 200)));
          const chip = (pos, lab, col, at) => {
            const p = scr(K, pos[0], 1.05, pos[1]);
            CE.ptdChip(ctx, lab, p.x, p.y - 14, col, seg(u, at, at + 20), { size: 12 });
          };
          chip(MV.aryu, 'ARYU', 'rgb(45,212,191)', 10);
          chip(MV.toki, 'TOKIMITSU', 'rgb(45,212,191)', 12);
          chip(MV.rin, 'RIN', 'rgb(45,212,191)', 14);
          chip(MV.bachira, 'BACHIRA', 'rgb(45,212,191)', 16);
          chip(MV.nagi, 'NAGI', 'rgb(203,213,225)', 18);
          chip(MV.chigiri, 'CHIGIRI', 'rgb(203,213,225)', 20);
          chip(bp, 'BAROU', 'rgb(234,179,8)', 6);
          chip(yp, 'VOCÊ', 'rgb(0,245,212)', 22);
          CE.finFillPat(ctx, 'scan', 0, top, W, bot - top, 0.35);
          CE.finKicker(ctx, 40, top + 30, 'METAVISÃO • O CAMPO VISTO DE CIMA', seg(u, 10, 50), '#5eead4');
          if (u > 150) CE.cineImpactText(ctx, 'UM PASSO ANTES.', 880, bot - 70, 56, '#00f5d4', seg(u, 150, 160), 520, -0.05);
        }
        // o seu olho → a pupila abre o campo
        if (t < into + 30) {
          const r = t < into ? 0 : ease(seg(t, into, into + 30)) * 900;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          if (r > 0) ctx.arc(ex, ey, r, 0, TAU, true);
          ctx.clip('evenodd');
          ctx.fillStyle = '#020409';
          ctx.fillRect(0, 0, W, H);
          const z = 1 + easeIO(t / into) * 0.12;
          ctx.translate(ex, ey);
          ctx.scale(z, z);
          ctx.translate(-ex, -ey);
          const dw = 900;
          const U = dw / 16;
          CE.wcdEyeBand(ctx, c.you, ex + 3.5 * U, ey, dw, { dim: 0.2, dimTint: '2,8,20' });
          CE.wcdEyes(ctx, ex + 3.5 * U, ey, U, { char: c.you, ring: '#5eead4', iris: '#083344', tiny: t > 30, glow: 'rgba(0,245,212,0.5)', glowA: seg(t, 20, 60), reflect: '#ef4444', shine: 1 });
          ctx.restore();
          if (r > 0) {
            ctx.strokeStyle = '#5eead4';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, TAU);
            ctx.stroke();
          }
        }
        if (t < into) CE.rincStamp(ctx, '...!', 980, top + 110, 64, '#e0f2fe', t, 30, 3);
        CE.cineSfx(S, into, 'meta', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const steal = 96;
        const slow = t >= steal - 30 && t < steal + 20;
        if (t >= steal && t < steal + 22) {
          const e = seg(t, steal, steal + 22);
          const pts = [];
          for (let i = 0; i < 6; i++) {
            const q = Math.max(0, e - i * 0.06);
            pts.push([lerp(52.8, 53.55, q), lerp(9.0, 6.35, q), lerp(0.05, 0.78, q)]);
          }
          streak3(ctx, K, pts, '#00f5d4', 22, 0.9);
        }
        if (slow) CE.ptdSpeed(ctx, S, t, '#e0f2fe', 0.25, -1, 30, 22);
        // painéis: o rosto do Barou em choque e os seus olhos frios
        const kA = ease(seg(t, steal + 14, steal + 30));
        if (kA > 0) {
          CE.finPanel(ctx, [[760, top + 16], [W - 20, top + 16], [W - 20, 360], [780, 350]], () => {
            CE.cineGradient(ctx, 740, top, 560, 300, [[0, '#2a0606'], [1, '#0a0303']]);
            CE.drawRadialSpeedLines(ctx, 1020, 240, 600, '#fecaca', 0.18);
            const r = CE.finHead(ctx, c.barou, 1020, 250, 600, { rim: '#fca5a5' });
            CE.wcdEyes(ctx, 1020, 250, r.u, { char: c.barou, ring: '#dc2626', iris: '#450a0a', tiny: true, look: Math.round(Math.sin(t * 0.5)) });
            ctx.fillStyle = 'rgba(186,230,253,0.85)';
            ctx.fillRect(Math.round(1020 + 7.4 * r.u), Math.round(250 - 1.2 * r.u + ease(seg(t, steal + 30, 260)) * 2.4 * r.u), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
          }, { dx: (1 - kA) * 520, border: '#fecaca' });
        }
        const kB = ease(seg(t, steal + 60, steal + 76));
        if (kB > 0) {
          CE.finPanel(ctx, [[780, 366], [W - 20, 374], [W - 20, bot - 16], [760, bot - 16]], () => {
            CE.cineGradient(ctx, 740, 360, 560, 300, [[0, '#04202a'], [1, '#020617']]);
            const U = CE.wcdEyeBand(ctx, c.you, 1030, 500, 500, {});
            CE.wcdEyes(ctx, 1030, 500, U, { char: c.you, ring: '#5eead4', iris: '#083344', angry: true, glow: 'rgba(0,245,212,0.4)' });
          }, { dy: (1 - kB) * 300, border: '#99f6e4' });
        }
        if (t >= steal) CE.cineImpactText(ctx, 'ROUBADO.', 380, top + 110, 76, '#00f5d4', seg(t, steal, steal + 8), 560, -0.08);
        if (t >= steal) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, steal, steal + 10)), '#ccfbf1');
        CE.cineSfx(S, steal, 'roubo', () => window.SFX?.kick?.(1));
      } else if (phase === 3) {
        const imp = 26;
        if (t < imp) {
          const e = ease(seg(t, 0, 12));
          const p = scr(K, lerp(53.4, 53.7, e), 0.75, lerp(7.4, 6.2, e));
          CE.ptdRings(ctx, p.x, p.y, seg(t, 2, 24), ['#5eead4', '#f8fafc'], 300, 0);
          CE.cineSfx(S, 2, 'rede', () => window.SFX?.goal?.(true));
          return;
        }
        if (t < imp + 18) {
          const u = t - imp;
          CE.drawRadialSpeedLines(ctx, 520, 330, W, '#020617', 0.6);
          const pb = scr(K, 53.2, 1.0, 9.55);
          CE.sselNeg(ctx, S);
          CE.sselCrack(ctx, pb.x, pb.y, 1, '#e0f2fe', '#06111f', 0.8);
          CE.cineImpactText(ctx, 'GOL!', W * 0.68, top + 120, 130, '#00f5d4', seg(u, 0, 4), W * 0.5, -0.08);
          CE.cineSfx(S, imp, 'impacto', () => window.SFX?.kick?.(1));
          return;
        }
        const u = t - imp - 18;
        const pc = scr(K, 52.95, 1.02, 9.6);
        if (u > 40 && u < 100) CE.sselCrack(ctx, pc.x, pc.y, seg(u, 40, 70), '#fef08a', '#1c1003', 0.3);
        CE.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.08);
        CE.rincStamp(ctx, 'O SEU GOL...', 960, top + 100, 46, '#e0f2fe', u, 50, 3);
        CE.rincStamp(ctx, '...AGORA É MEU.', 960, top + 160, 46, '#00f5d4', u, 90, 3);
        CE.cineSfx(S, imp + 18 + 100, 'coroa', () => window.SFX?.post?.());
      } else if (phase === 4) {
        const cut = 150;
        if (t < cut) {
          const p = scr(K, 52.95, 0.05, 9.6);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1, 0.22);
          CE.cineGlow(ctx, 0, 0, 260, 'rgba(220,38,38,0.35)');
          ctx.restore();
          CE.finKicker(ctx, 40, top + 30, 'SHOUEI BAROU • O REI', seg(t, 10, 50), '#eab308');
          CE.finKicker(ctx, 40, top + 58, 'DE JOELHOS', seg(t, 40, 80), '#ef4444');
          return;
        }
        const u = t - cut;
        // meio rosto no escuro: a metade da direita some
        const pf = scr(K, 52.0, 0.62, 11.1);
        CE.cineGlow(ctx, pf.x - 120, pf.y, 420, 'rgba(0,245,212,0.14)');
        CE.foxcGradH(ctx, pf.x - 20, top - 40, 160, bot - top + 80, [[0, 'rgba(2,3,5,0)'], [1, 'rgba(2,3,5,0.96)']]);
        ctx.fillStyle = 'rgba(2,3,5,0.96)';
        ctx.fillRect(pf.x + 139, top - 40, W, bot - top + 80);
        CE.rincStamp(ctx, 'EU DEVOREI...', 320, top + 120, 60, '#e2e8f0', u, 20, 3);
        CE.cineImpactText(ctx, 'O REI.', 330, bot - 110, 110, '#00f5d4', seg(u, 64, 74), 560, -0.05);
        if (u >= 64) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 64, 76)), '#ccfbf1');
        CE.cineSfx(S, cut + 64, 'devorar', () => window.SFX?.kick?.(1));
      } else {
        const kp = ease(seg(t, 24, 40)) * (1 - seg(t, 150, 166));
        if (kp > 0) {
          CE.finPanel(ctx, [[700, top + 18], [W - 22, top + 12], [W - 22, top + 170], [716, top + 182]], () => {
            ctx.fillStyle = '#02080b';
            ctx.fillRect(680, top, 620, 200);
            const U = CE.wcdEyeBand(ctx, c.rin, 990, top + 96, 700, {});
            CE.wcdEyes(ctx, 990, top + 96, U, { char: c.rin, ring: '#22d3ee', iris: '#021a1d', angry: true, line: '#010409', glow: 'rgba(34,211,238,0.5)' });
          }, { dx: (1 - kp) * 600, border: '#a5f3fc' });
        }
        CE.rincStamp(ctx, 'VOCÊ.', 980, bot - 120, 70, '#a5f3fc', t, 40, 4, 0, 'center', 1 - seg(t, 150, 166));
        const tk = seg(t, 160, 196);
        if (tk > 0) {
          CE.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * tk})`], [1, `rgba(2,6,23,${0.85 * tk})`]]);
          CE.cineTitleCard(ctx, W, bot - 100, tk, { kicker: '2ª SELEÇÃO • O TIME DO RIN', title: 'DEVORANDO O REI', sub: 'Você, o Rin e o Bachira: o caminho até o World Five.', color: '#22d3ee' });
        }
        CE.cineSfx(S, 160, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    }
  });

  // ==========================================================================
  // 4. BLUE LOCK x WORLD FIVE — o campo vira estádio holográfico. v = 'lose' | 'win'
  // ==========================================================================
  // a torcida holográfica: placas de pontinhos acesos em cima das arquibancadas do campo
  const STANDS = lazy(() =>
    mkCv(256, 48, (g, w, h) => {
      g.fillStyle = 'rgba(6,14,36,0.9)';
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const y = 3 + Math.round(r * 5.4);
        g.fillStyle = r % 2 ? '#0a1636' : '#0c1a40';
        g.fillRect(0, y + 3, w, 2);
        for (let x = (r % 2) * 2; x < w; x += 4) {
          if (rnd(x * 7 + r, 5) > 0.78) continue;
          const q = rnd(x + r * 300, 3);
          g.fillStyle = q < 0.55 ? '#38bdf8' : q < 0.8 ? '#e0f2fe' : '#facc15';
          g.fillRect(x, y, 2, 2);
        }
      }
      g.fillStyle = '#38bdf8';
      g.fillRect(0, h - 2, w, 2);
      g.fillRect(0, 0, w, 1);
    })
  );
  function holoStands(K, burst = 0) {
    const col = K.mix([0.5, 0.6, 0.78], [1.25, 1.3, 1.35], clamp(burst));
    const o = { z: 1.75, h: 2.3, img: STANDS(), color: col, em: true, alpha: 0.92 };
    plate(K, Object.assign({ x: 53, y: 5.55, w: 16.4, ang: Math.PI / 2 }, o));
    plate(K, Object.assign({ x: 53, y: 23.45, w: 16.4, ang: -Math.PI / 2 }, o));
    plate(K, Object.assign({ x: 44.55, y: 14.5, w: 17.4, ang: 0 }, o));
    plate(K, Object.assign({ x: 61.45, y: 14.5, w: 17.4, ang: Math.PI }, o));
  }
  // telão do Ego por cima do telão do saguão (o finEgoScreen da versão 2D, num canvas)
  const EGOCV = { cv: null, f: -99 };
  function egoScreen(t, ticker) {
    if (!EGOCV.cv) EGOCV.cv = mkCv(512, 180);
    const f = Math.floor(t / 3);
    if (f === EGOCV.f) return { cv: EGOCV.cv, dirty: false };
    EGOCV.f = f;
    const g = EGOCV.cv.getContext('2d');
    g.clearRect(0, 0, 512, 180);
    CE.finEgoScreen(g, 0, 0, 512, 180, t, { live: true, ticker });
    return { cv: EGOCV.cv, dirty: true };
  }
  const W5 = [
    { id: 'luna', nm: 'LUNA', col: '#c084fc', anim: 'run', lose: '1 x 2', win: 'BLOQUEADO' },
    { id: 'blake', nm: 'BLAKE', col: '#ef4444', anim: 'shoot', lose: '1 x 3', win: 'NA TRAVE' },
    { id: 'dada_silva', nm: 'DADA SILVA', col: '#22c55e', anim: 'call_pass', lose: '1 x 4', win: 'AFASTADA' },
    { id: 'pablo', nm: 'PABLO', col: '#38bdf8', anim: 'shoot', lose: '1 x 5' }
  ];
  const DEF = [[51.3, 12.2], [53.0, 12.0], [54.7, 12.2]];
  const LK0 = [48.7, 12.9];
  const LK1 = [57.5, 11.2];

  function w5Scene(v) {
    const win = v === 'win';
    return function (K, S) {
      const { t, phase, dur } = S;
      const n = (a, s = 1) => K.noise(S.f * 0.9, s) * a;
      pitchNight(K, { top: '#01030a', hor: '#071233', stars: 0.5 });
      K.expo(1.0);
      if (phase === 0) {
        const kick = 40;
        const cut = 66;
        if (t < cut) {
          holoStands(K, 0.15);
          // o Rin arranca e solta a bomba
          const rk = seg(t, 0, kick - 10);
          const rp = mix([52.2, 13.8], [52.75, 11.7], rk);
          const st = t < kick - 10 ? 'run' : t < kick ? 'windup' : 'shoot';
          K.actor('rin', { x: rp[0], y: rp[1], face: [53, 6], anim: st, frame: st === 'run' ? undefined : 1, extra: BL, light: [0.95, 1.2, 1.3] });
          if (t < kick) K.ball(rp[0] + 0.05, rp[1] - 0.36, 0.05);
          else K.ball(...bez3([52.8, 11.35, 0.05], [53.4, 9.0, 1.1], [53.85, 6.55, 0.85], seg(t, kick, cut)), { glow: true });
          const sh = t >= kick ? 0.05 : 0.006;
          K.cam([lerp(50.3, 50.45, rk) + n(sh), 0.42 + n(sh * 0.6, 3), lerp(12.9, 12.5, rk)], [rp[0], 0.58, rp[1] - 0.2], 38);
        } else {
          // o gol de frente; a torcida holográfica explode; o Rin de costas, frio
          const u = t - cut;
          const burst = seg(u, 4, 20) * (1 - 0.5 * seg(u, 140, 230));
          holoStands(K, burst);
          K.ball(53.85, 6.4, lerp(0.85, 0.08, ease(seg(u, 0, 20))));
          K.actor('rin', { x: 51.85, y: 10.0, face: [52.2, 6], extra: BL, light: [0.85, 1.1, 1.2] });
          K.actor('you', { x: 50.2, y: 11.2, face: [53, 7], extra: BL, frame: 0 });
          K.actor('loki', { x: 55.4, y: 9.4, face: [51.85, 10.0], extra: WORLD, frame: 0 });
          const k = easeIO(u / (dur - cut));
          K.cam([lerp(52.75, 52.85, k) + n(0.006 + 0.06 * (1 - seg(u, 0, 30))), lerp(0.78, 0.86, k), lerp(12.2, 12.6, k)], [53.0, 0.55, 6.8], lerp(40, 44, k));
        }
      } else if (phase === 1) {
        holoStands(K, 0.2);
        const cut = 90;
        const u = t - cut;
        const go = 40;
        const arrive = go + 6;
        const lx = u < go ? LK0 : u < arrive ? mix(LK0, LK1, seg(u, go, arrive)) : LK1;
        DEF.forEach((p, i) => {
          const turned = u > arrive + 6 + i * 3;
          K.actor(['you', 'aryu', 'tokimitsu'][i], { x: p[0], y: p[1], face: turned ? LK1 : LK0, extra: BL, light: [0.95, 1.0, 1.1] });
        });
        if (u < go || u >= arrive) {
          const shoot = u >= arrive && u < arrive + 30;
          K.actor('loki', { x: lx[0], y: lx[1], face: u >= arrive ? [53, 6.6] : [55, 12.4], anim: shoot ? 'shoot' : 'idle', frame: shoot ? 1 : undefined, extra: WORLD, light: [1.25, 1.15, 0.95] });
        }
        // o rastro dourado da Velocidade Divina
        if (u >= go && u < arrive + 30) {
          const a = 1 - seg(u, arrive, arrive + 30);
          const len = lx[0] - LK0[0];
          if (len > 0.1) {
            plate(K, { x: LK0[0] + len / 2, y: lerp(LK0[1], lx[1], 0.5) + 0.05, z: 0.18, w: len, h: 0.34, ang: Math.PI / 2, color: '#f59e0b', alpha: 0.5 * a, em: true });
            plate(K, { x: LK0[0] + len / 2, y: lerp(LK0[1], lx[1], 0.5) + 0.06, z: 0.3, w: len, h: 0.1, ang: Math.PI / 2, color: '#fef3c7', alpha: 0.7 * a, em: true });
          }
        }
        if (u < arrive + 4) K.ball(lx[0] + 0.3, lx[1] + 0.05, 0.05);
        else {
          const e = seg(u, arrive + 4, arrive + 20);
          if (e < 1) K.ball(lerp(LK1[0] - 0.2, 53.6, e), lerp(LK1[1] - 0.3, 6.5, e), lerp(0.05, 0.8, e), { glow: true });
        }
        const sh = u >= go ? 0.07 * (1 - seg(u, go, go + 30)) : 0.006;
        K.cam([53 + n(sh), 0.75 + n(sh * 0.6, 4), 17.0], [53, 0.45, 12.0], 44);
      } else if (phase === 2) {
        // montagem: um lance de cada (cortes secos)
        holoStands(K, 0.35);
        const list = win ? W5.slice(0, 3).concat([{ id: 'you', nm: CE.cinePlayerName(), col: '#00f5d4', anim: 'shoot', win: 'VIRADA!' }]) : W5;
        let i = 0;
        for (let j = 1; j < 4; j++) if (t >= 6 + j * 62) i = j;
        const s = list[i];
        const lt = t - (6 + i * 62);
        const P = [53, 12.4];
        const kit = s.id === 'you' ? BL : WORLD;
        const hop = s.anim === 'call_pass' ? 0.22 * Math.sin(seg(lt, 0, 40) * Math.PI) : 0;
        const runY = s.anim === 'run' ? lerp(13.2, 12.2, seg(lt, 0, 62)) : P[1];
        K.actor(s.id, { x: P[0], y: runY, z: hop, face: [53, 6.6], anim: s.anim, frame: s.anim === 'run' ? undefined : 1, extra: kit, light: [1.12, 1.1, 1.08] });
        if (s.anim === 'run') K.ball(P[0] + 0.05, runY - 0.36, 0.05);
        else if (s.anim === 'shoot') {
          const e = seg(lt, 6, 26);
          K.ball(lerp(P[0], 53.5, e), lerp(P[1] - 0.35, 6.6, e), lerp(0.05, 0.8, e), { glow: e > 0 });
        } else K.ball(P[0] + 0.1, P[1] - 0.5, 0.35 + hop * 2.5);
        if (win && i === 0) K.actor('chigiri', { x: 53.1, y: lerp(11.0, 11.7, seg(lt, 10, 30)), face: [53, 14], anim: lt > 10 ? 'slide' : 'run', frame: 1, extra: BL });
        const a0 = [3.0, 2.45, -2.6, 2.2][i] + lt * 0.004;
        const r = 2.2;
        K.cam([P[0] + Math.sin(a0) * r, 0.5 + n(0.004), runY + Math.cos(a0) * r], [P[0], 0.5, runY], 34);
      } else if (phase === 3) {
        const cut = 120;
        if (t < cut) {
          holoStands(K, win ? 0.6 : 0.05);
          if (!win) K.actor('you', { x: 53.0, y: 12.8, z: -0.14, ang: 0, anim: 'dive', frame: 1, extra: BL, light: [0.8, 0.85, 0.95], shadow: 0 });
          else K.actor('you', { x: 52.4, y: 13.0, face: [54.2, 11.6], extra: BL, light: [1.0, 1.08, 1.12] });
          K.actor('loki', { x: 54.2, y: 11.6, face: win ? [52.4, 13.0] : [54.5, 6.6], extra: WORLD, light: [1.15, 1.08, 0.95] });
          K.actor('rin', { x: 50.6, y: 11.0, face: [53, 13], extra: BL, frame: 0 });
          const k = easeIO(t / cut);
          K.cam([lerp(52.2, 52.3, k), lerp(1.45, 1.35, k), lerp(16.4, 16.0, k)], [53.4, 0.3, 12.3], 42);
        } else {
          // do chão, olhando para cima: o Loki e a mão estendida
          holoStands(K, win ? 0.5 : 0.1);
          K.sky('#010309', '#0b1440', 0.8);
          const u = t - cut;
          const k = easeIO(u / (dur - cut));
          K.actor('loki', { x: 53.2, y: 12.15, face: [53.25, 13.4], extra: WORLD, light: [1.1, 1.02, 0.92] });
          K.cam([53.25, lerp(0.14, 0.16, k), lerp(13.55, 13.45, k)], [53.15, 0.82, 11.95], 46);
        }
      } else {
        // o telão do saguão: quem marcou contra o mundo
        const ticker = win ? 'BLUE LOCK x WORLD FIVE • VITÓRIA • NÃO É O TOPO • É A PROVA DE QUE ELE EXISTE •' : 'BLUE LOCK x WORLD FIVE • DERROTA • GOLS CONTRA O WORLD FIVE: RIN ITOSHI • RYUSEI SHIDOU •';
        const s = egoScreen(t, ticker);
        plate(K, { x: 25, y: 9.03, z: 0.24, w: 3.84, h: 1.35, ang: Math.PI / 2, img: s.cv, dirty: s.dirty, em: true });
        K.expo(0.9);
        K.actor('you', { x: 24.1, y: 11.7, face: [25, 9], extra: BL });
        K.actor('rin', { x: 25.95, y: 11.8, face: [25, 9], extra: BL });
        K.actor('shidou', { x: 27.1, y: 12.2, face: [25, 9], extra: BL, frame: 0 });
        K.actor('bachira', { x: 23.0, y: 12.2, face: [25, 9], extra: BL, frame: 0 });
        K.actor('nagi', { x: 22.4, y: 11.5, face: [25, 9], extra: BL, frame: 0 });
        K.actor('chigiri', { x: 27.7, y: 11.4, face: [25, 9], extra: BL, frame: 0 });
        const k = easeIO(t / dur);
        K.cam([25 + n(0.005), lerp(1.12, 1.2, k), lerp(15.9, 14.7, k)], [25, lerp(0.9, 0.95, k), 9.0], lerp(46, 42, k));
      }
    };
  }
  function w5Overlay(v) {
    const win = v === 'win';
    return function (ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.sselCast();
      if (phase === 0) {
        const kick = 40;
        const cut = 66;
        if (t < cut) {
          const rk = seg(t, 0, kick - 10);
          const rp = mix([52.2, 13.8], [52.75, 11.7], rk);
          const p = scr(K, rp[0], 0.5, rp[1]);
          CE.ptdRays(ctx, p.x, p.y, 900, '#22d3ee', 0.12 + (t >= kick ? 0.12 : 0), t * 0.004, 40, 0.03);
          if (t >= kick) {
            const e = seg(t, kick, cut);
            const pts = [];
            for (let i = 0; i < 9; i++) pts.push(bez3([52.8, 11.35, 0.05], [53.4, 9.0, 1.1], [53.85, 6.55, 0.85], Math.max(0, e - i * 0.05)));
            streak3(ctx, K, pts, '#22d3ee', 34, 0.9);
          }
          CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK  x  WORLD FIVE', seg(t, 4, 30), '#38bdf8');
          CE.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
          return;
        }
        const u = t - cut;
        const burst = seg(u, 4, 20) * (1 - 0.5 * seg(u, 140, 230));
        CE.sselStadiumBurst(ctx, t, burst);
        const pb = scr(K, 53.85, 0.6, 6.4);
        CE.ptdRings(ctx, pb.x, pb.y, seg(u, 0, 26), ['#67e8f9', '#f8fafc'], 260, 0);
        CE.sselBoard(ctx, 640, top + 70, 1, 0, { k: seg(u, 30, 46), pop: 1 - seg(u, 30, 60), popSide: 'h', s: 0.8 });
        CE.cineImpactText(ctx, 'GOL!', 980, bot - 100, 110, '#22d3ee', seg(u, 2, 12), 0, -0.08);
        CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 0, 12)), '#cffafe');
        CE.cineSfx(S, cut, 'gol', () => window.SFX?.goal?.(true));
      } else if (phase === 1) {
        const cut = 90;
        if (t < cut) {
          eyeStrip(ctx, S, c.loki, 1, {
            h: 300, dw: 1180, bg: '#05040a', border: '#020617', zoom: easeIO(t / cut) * 0.06,
            eyes: { ring: '#f0b429', iris: '#78350f', half: t < 40, lid: CE.finShade(c.loki.skinColor, -0.25), shine: 1, glow: 'rgba(251,191,36,0.45)', glowA: seg(t, 40, 70) }
          });
          CE.rincStamp(ctx, 'VELOCIDADE DIVINA.', 640, bot - 54, 54, '#fde68a', t, 40, 2, W * 0.8);
          return;
        }
        const u = t - cut;
        const go = 40;
        const arrive = go + 6;
        DEF.forEach((p, i) => {
          if (u > arrive && u < arrive + 50) {
            const q = scr(K, p[0], 1.05, p[1]);
            CE.cineImpactText(ctx, '!?', q.x + 30, q.y - 10, 30, '#facc15', seg(u, arrive + i * 3, arrive + 8 + i * 3), 0, 0.1);
          }
        });
        if (u >= go && u < go + 24) {
          const q = scr(K, LK0[0], 0.2, LK0[1]);
          CE.ptdRings(ctx, q.x, q.y, seg(u, go, go + 24), ['#fde68a', '#f8fafc'], 220, 0);
        }
        CE.sselBoard(ctx, 640, top + 70, 1, 1, { k: seg(u, 120, 140), pop: 1 - seg(u, 120, 150), popSide: 'a', red: true, s: 0.8 });
        CE.ptdSpeed(ctx, S, t, '#fde68a', 0.2 * (u >= go && u < arrive + 40 ? 1 : 0), 1, 50, 20);
        if (u >= go) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(u, go, go + 10)), '#fef3c7');
        CE.finKicker(ctx, 40, top + 30, 'JULIAN LOKI • WORLD FIVE', seg(u, 4, 40), '#fbbf24');
        CE.cineSfx(S, cut + go, 'divina', () => window.SFX?.whoosh?.());
        CE.cineSfx(S, cut + arrive + 4, 'chute', () => window.SFX?.kick?.(1));
      } else if (phase === 2) {
        const list = win ? W5.slice(0, 3).concat([{ nm: CE.cinePlayerName(), col: '#00f5d4', win: 'VIRADA!' }]) : W5;
        let i = 0;
        for (let j = 1; j < 4; j++) if (t >= 6 + j * 62) i = j;
        const s = list[i];
        const lt = t - (6 + i * 62);
        const res = win ? s.win : s.lose;
        const rc = win ? (i === 3 ? '#00f5d4' : '#38bdf8') : '#fca5a5';
        // a faixa de mangá: só o meio fica aberto; os lances anteriores ficam na lateral
        const sl = 40;
        const x0 = W * 0.27;
        const x1 = W * 0.73;
        const pts = [[x0 + sl, top + 14], [x1 + sl, top + 14], [x1 - sl, bot - 14], [x0 - sl, bot - 14]];
        const pp = scr(K, 53, 0.5, 12.4);
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
        CE.ptdRays(ctx, pp.x, pp.y, 620, s.col, 0.22, lt * 0.01, 40, 0.03);
        CE.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.12);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, W, bot - top);
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip('evenodd');
        ctx.fillStyle = '#04060c';
        ctx.fillRect(0, top, W, bot - top);
        CE.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#020617';
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.strokeStyle = s.col;
        ctx.stroke();
        ctx.restore();
        // a lista dos lances que já foram
        for (let j = 0; j < i; j++) {
          const sj = list[j];
          CE.ptdChip(ctx, sj.nm + '  •  ' + (win ? sj.win : sj.lose), 150, top + 70 + j * 56, sj.col, 1, { size: 14 });
        }
        CE.rincStamp(ctx, s.nm, 640, top + 60, 40, '#f8fafc', lt, 8, 2, W * 0.4);
        CE.cineImpactText(ctx, res, 640, bot - 70, 56, rc, seg(lt, 24, 32), W * 0.4, -0.06);
        for (let j = 0; j < 4; j++) CE.cineSfx(S, 6 + j * 62 + 24, 'lance' + j, () => (win && j < 3 ? window.SFX?.save?.() : window.SFX?.kick?.(0.9)));
        const fk = seg(t, 270, 290);
        if (fk > 0) {
          ctx.fillStyle = `rgba(2,4,10,${0.6 * fk})`;
          ctx.fillRect(0, top, W, bot - top);
          if (win) CE.cineImpactText(ctx, 'O BLUE LOCK VIROU!', 640, (top + bot) / 2, 96, '#00f5d4', seg(t, 276, 288), W * 0.86, -0.05);
          else CE.cineImpactText(ctx, '1 x 5', 640, (top + bot) / 2, 170, '#ef4444', seg(t, 276, 288), W * 0.7, -0.05);
          CE.cineSfx(S, 276, 'fim', () => window.SFX?.kick?.(1));
        }
      } else if (phase === 3) {
        const cut = 120;
        if (t < cut) {
          if (win) CE.sselBoard(ctx, 640, top + 80, 0, 0, { text: 'FIM • BLUE LOCK VENCE', green: true, s: 0.95, textColor: '#86efac' });
          else CE.sselBoard(ctx, 640, top + 80, 1, 5, { red: true, s: 1.05 });
          CE.finKicker(ctx, 40, bot - 36, 'FIM DE JOGO', seg(t, 4, 30), win ? '#22c55e' : '#ef4444');
          CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
          return;
        }
        const u = t - cut;
        if (win) CE.sselBoard(ctx, 300, top + 70, 0, 0, { text: 'BLUE LOCK VENCE', green: true, s: 0.6, textColor: '#86efac' });
        else CE.sselBoard(ctx, 300, top + 70, 1, 5, { red: true, s: 0.6 });
        // a mão (pixel art) entrando na tela
        const hk = ease(seg(u, 30, 70));
        const hv = CE.sselHandCv();
        const px = 16;
        const hx = 400 - (hv.width * px) / 2;
        const hy = lerp(bot + 40, win ? 300 : 260, hk);
        ctx.save();
        if (win) {
          ctx.translate(hx + (hv.width * px) / 2, hy + (hv.height * px) / 2);
          ctx.rotate(-0.4);
          ctx.translate(-(hx + (hv.width * px) / 2), -(hy + (hv.height * px) / 2));
        }
        CE.wcdPix(ctx, hv, hx, hy, px);
        ctx.restore();
        if (win && u < 70) CE.cineImpactText(ctx, '...!', 1080, top + 100, 60, '#fde68a', seg(u, 4, 12), 0, 0.08);
        CE.finKicker(ctx, 40, bot - 40, 'JULIAN LOKI', seg(u, 10, 40), '#fbbf24');
      } else {
        CE.cineGlow(ctx, 640, top + 140, 520, 'rgba(0,245,212,0.12)');
        const cards = win
          ? [[c.you, CE.cinePlayerName(), '0,170,160', 'VIROU O JOGO'], [c.rinBL, 'RIN ITOSHI', '8,145,178', 'ABRIU O PLACAR']]
          : [[c.rinBL, 'RIN ITOSHI', '8,145,178', 'MARCOU'], [c.shidou, 'RYUSEI SHIDOU', '219,39,119', 'MARCOU']];
        cards.forEach(([ch, nm, rgb, tag], i) => {
          const x = i ? 1110 : 170;
          CE.sselCard(ctx, x, 330, 180, 240, ch, nm, rgb, seg(t, 60 + i * 30, 84 + i * 30), seg(t, 90 + i * 30, 110 + i * 30), 0, tag);
        });
        const tk = seg(t, 230, 262);
        if (tk > 0) {
          CE.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * tk})`], [1, `rgba(2,6,23,${0.85 * tk})`]]);
          CE.cineTitleCard(ctx, W, bot - 100, tk, win
            ? { kicker: 'BLUE LOCK x WORLD FIVE', title: 'O TOPO EXISTE', sub: 'Vencer uma vez é só o começo.', color: '#00f5d4' }
            : { kicker: '2ª SELEÇÃO • RESULTADO FINAL', title: 'TOP 6', sub: 'Só quem marcou contra o mundo.', color: '#00f5d4' });
        }
        CE.cineSfx(S, 230, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    };
  }

  CE.registerCine3D('world_five_fall', {
    phases: [300, 300, 330, 330, 340],
    music: 'dread',
    title: '🌍 O MURO DO MUNDO',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • VELOCIDADE DIVINA', 'PLANO 3 • O MUNDO RESPONDE', 'PLANO 4 • A MÃO DO LOKI', 'PLANO 5 • TOP 6'],
    subs: [
      [{ from: 16, to: 298, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [{ from: 20, to: 298, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 328, who: 'NARRADOR', text: 'Luna. Blake. Dada Silva. Pablo. Um gol atrás do outro.', color: NARR_C }],
      [{ from: 124, to: 328, who: 'JULIAN LOKI', text: '"Bom jogo. Vocês ainda estão longe."', color: LOKI_C }],
      [
        { from: 8, to: 206, who: 'EGO', text: '"Só o Rin e o Shidou marcaram contra eles."', color: EGO_C },
        { from: 210, to: 338, who: 'EGO', text: '"Isso define o Top 6."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.55,
    theme: 'bluelock_holo',
    scene: w5Scene('lose'),
    overlay: w5Overlay('lose')
  });

  CE.registerCine3D('world_five_win', {
    phases: [300, 300, 330, 330, 340],
    music: 'epic',
    title: '🌍 O MUNDO SUOU',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • VELOCIDADE DIVINA', 'PLANO 3 • O BLUE LOCK AGUENTA', 'PLANO 4 • A MÃO DO LOKI', 'PLANO 5 • O TOPO EXISTE'],
    subs: [
      [{ from: 16, to: 298, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [{ from: 20, to: 298, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 328, who: 'NARRADOR', text: 'O mundo veio com tudo. O Blue Lock aguentou... e virou.', color: NARR_C }],
      [{ from: 40, to: 328, who: 'JULIAN LOKI', text: '"Vocês me fizeram suar. Guarde esse nome: Julian Loki."', color: LOKI_C }],
      [
        { from: 8, to: 166, who: 'EGO', text: '"Vencer uma vez não é o topo."', color: EGO_C },
        { from: 170, to: 338, who: 'EGO', text: '"É a prova de que o topo existe."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.55,
    theme: 'bluelock_holo',
    scene: w5Scene('win'),
    overlay: w5Overlay('win')
  });

  // ajudantes usados também pelas cenas do js/cine3d_manga.js (a sala branca, a faixa dos olhos)
  CE._c3b = { mkCv, lazy, plate, scr, bez3, streak3, eyeStrip, introCard, whiteRoom, RM, BL, TEAL };
})();
