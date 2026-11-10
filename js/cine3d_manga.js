// ============================================================================
// CUTSCENES EM 3D — momentos do mangá (js/cine_manga.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   nagi_reo_split • a sala branca (montada no vazio K.VOID, a mesma da cine3d_selecao2)
//   itoshi_snow    • a praia de Kamakura no verão e a rua de neve à noite (no vazio):
//                    areia, mar, casas, o poste aceso, as pegadas
// Os closes nos olhos, os painéis de mangá, a lembrança congelando e os textos grandes
// ficam no overlay (ajudantes 2D da cine_manga/cine_final/cine_wildcard).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE._c3b) return;
  const B = CE._c3b;
  const { mkCv, lazy, plate, scr, eyeStrip, introCard, whiteRoom } = B;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };

  const REO_C = '#c084fc';
  const NAGI_C = '#e2e8f0';
  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const NARR_C = '#94a3b8';
  const REO_RGB = '168,85,247';
  const NAGI_RGB = '100,116,139';
  const YOU_RGB = '13,148,136';
  const BLK = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };

  // placa deitada girada (anel holográfico que roda no chão)
  function disc(K, x, y, r, ang, o) {
    const c = Math.cos(ang) * r;
    const s = Math.sin(ang) * r;
    const z = o.z || 0.012;
    const p = [[x - c + s, y - s - c], [x + c + s, y + s - c], [x + c - s, y + s + c], [x - c - s, y - s + c]];
    const v = [];
    const P = (q, u, vv) => v.push(q[0], z, q[1], u, vv, 0, 1, 0);
    P(p[0], 0, 0);
    P(p[1], 1, 0);
    P(p[2], 1, 1);
    P(p[0], 0, 0);
    P(p[2], 1, 1);
    P(p[3], 0, 1);
    K._push(v, o);
  }

  // ==========================================================================
  // 1. NAGI E REO — O TESOURO QUE FOI EMBORA (a sala branca)
  // ==========================================================================
  const NR = { reo: [84.6, 14.6], nagi: [86, 14.4], you: [87.4, 14.6] };
  const RING = lazy(() =>
    mkCv(96, 96, (g) => {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.setLineDash([14, 8]);
      g.beginPath();
      g.arc(48, 48, 44, 0, TAU);
      g.stroke();
      g.setLineDash([10, 10]);
      g.lineWidth = 2;
      g.beginPath();
      g.arc(48, 48, 34, 0, TAU);
      g.stroke();
    })
  );
  // telas holográficas perto da lente (passam mais rápido = profundidade)
  const HOLO = lazy(() =>
    mkCv(64, 96, (g, w, h) => {
      g.fillStyle = 'rgba(125,211,252,0.22)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(125,211,252,0.18)';
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      g.strokeStyle = 'rgba(14,165,233,0.8)';
      g.lineWidth = 2;
      g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = 'rgba(14,165,233,0.7)';
      for (let j = 0; j < 7; j++) g.fillRect(8, 12 + j * 11, 12 + ((j * 53) % 34), 4);
    })
  );
  const roomScreen = (S, t) =>
    S.phase === 4 && t >= 70
      ? { kick: 'RESULTADO', title: `NAGI  →  ${CE.cinePlayerName()}`, sub: 'REO MIKAGE  •  SEM DUPLA', rgb: '94,234,212', dark: true }
      : S.phase === 2
        ? { kick: '2ª SELEÇÃO', title: 'A ESCOLHA', sub: '', rgb: '14,165,233' }
        : { kick: '2ª SELEÇÃO', title: 'A ESCOLHA', sub: 'O VENCEDOR LEVA UM JOGADOR DO PERDEDOR', rgb: '14,165,233' };

  CE.registerCine3D('nagi_reo_split', {
    phases: [206, 364, 340, 304, 286],
    music: 'mystery',
    title: '👑 O TESOURO QUE FOI EMBORA',
    tags: ['PLANO 1 • A SALA BRANCA', 'PLANO 2 • VEM COMIGO', 'PLANO 3 • EU QUERO', 'PLANO 4 • A MÃO NO AR', 'PLANO 5 • SOZINHO'],
    subs: [
      [],
      [{ from: 10, who: 'REO MIKAGE', text: '"Nagi, vem comigo. A gente começou isso juntos."', color: REO_C }],
      [{ from: 8, who: 'SEISHIRO NAGI', text: '"Desculpa, Reo. Eu quero jogar com ele."', color: NAGI_C }],
      [{ from: 8, who: 'NARRADOR', text: 'O tesouro do Reo escolheu outro dono.', color: NARR_C }],
      [{ from: 40, to: 270, who: 'REO MIKAGE', text: '"...Vai, então."', color: REO_C }]
    ],
    grain: 0,
    vignette: 0.5,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, dur } = S;
      const n = (a, s = 1) => K.noise(S.f * 0.8, s) * a;
      K.expo(0.95);
      if (phase === 0) {
        whiteRoom(K, { t, screen: roomScreen(S, t) });
        const u = Math.max(0, t - 46);
        // o anel holográfico da escolha em volta do Nagi
        disc(K, NR.nagi[0], NR.nagi[1], 0.62, u * 0.012, { img: RING(), color: '#0ea5e9', alpha: 0.5 + 0.25 * Math.sin(u * 0.08), em: true });
        disc(K, NR.nagi[0], NR.nagi[1], 0.8, -u * 0.009, { img: RING(), color: '#38bdf8', alpha: 0.35, em: true });
        K.actor('reo', { x: NR.reo[0], y: NR.reo[1], face: [86, 20], extra: BLK, light: [1.08, 1.0, 1.15] });
        K.actor('nagi', { x: NR.nagi[0], y: NR.nagi[1], face: [86, 20], extra: BLK });
        K.actor('you', { x: NR.you[0], y: NR.you[1], face: [86, 20], extra: BLK, light: [0.98, 1.08, 1.08] });
        const k = easeIO(u / (dur - 46));
        const eye = mix([86, 1.15, 20.0], [86.1, 0.95, 18.0], k);
        K.cam([eye[0] + n(0.006), eye[1] + n(0.004, 2), eye[2]], [86, 0.6, 14.3], lerp(40, 33, k));
        // primeiro plano: telas holográficas perto da lente
        [[84.7, 17.0, 0], [87.4, 16.8, 1]].forEach(([x, y]) => {
          const ang = Math.atan2(eye[2] - y, eye[0] - x);
          plate(K, { x, y, z: 0.35, w: 0.75, h: 1.1, ang, img: HOLO(), color: '#bae6fd', alpha: 0.75, em: true });
        });
      } else if (phase === 1) {
        // o Reo estende a mão: "vem comigo"
        whiteRoom(K, { t, screen: roomScreen(S, t), amb: '#ece8f4' });
        K.actor('reo', { x: NR.reo[0], y: NR.reo[1], face: [86.2, 15.4], anim: t > 40 ? 'call_pass' : 'idle', frame: t > 40 ? 1 : undefined, extra: BLK, light: [1.12, 1.0, 1.25] });
        K.actor('nagi', { x: NR.nagi[0], y: NR.nagi[1], face: NR.reo, extra: BLK, light: [0.85, 0.88, 0.95] });
        K.actor('you', { x: NR.you[0], y: NR.you[1], face: NR.reo, extra: BLK, light: [0.85, 0.9, 0.92], frame: 0 });
        const k = easeIO(t / 360);
        const tr = t > 250 ? Math.sin(t * 0.8) * 0.003 : 0;
        K.cam([lerp(86.75, 86.5, k) + n(0.006) + tr, lerp(0.84, 0.8, k), lerp(16.65, 16.35, k)], [lerp(84.95, 84.85, k), 0.55, 14.65], lerp(34, 31, k));
      } else if (phase === 2) {
        // o Nagi olha para o Reo... e depois para você
        const choose = 150;
        const wants = t >= choose;
        whiteRoom(K, { t, screen: roomScreen(S, t), amb: '#e8eef4' });
        const lookAt = t < 96 ? NR.reo : t < 128 ? mix(NR.reo, NR.you, seg(t, 96, 128)) : NR.you;
        const face = [lookAt[0], lookAt[1] + 2.6];
        K.actor('nagi', { x: NR.nagi[0], y: NR.nagi[1], face, extra: BLK, light: wants ? K.mix([1, 1.02, 1.06], [0.95, 1.18, 1.25], seg(t, choose, choose + 40)) : [1, 1.02, 1.06] });
        const k = easeIO(t / 330);
        K.cam([86 + n(0.006), lerp(0.74, 0.72, k), lerp(17.5, 17.2, k)], [86, 0.5, NR.nagi[1]], lerp(32, 30, k));
      } else if (phase === 3) {
        // o Nagi atravessa a sala; a mão do Reo fica no ar
        whiteRoom(K, { t, screen: roomScreen(S, t) });
        const wk = smooth(seg(t, 30, 150));
        const walking = wk > 0 && wk < 1;
        const nx = mix([85.6, 14.4], [86.95, 14.45], wk);
        K.actor('you', { x: 87.75, y: 14.55, face: [nx[0], nx[1]], extra: BLK, light: [0.98, 1.08, 1.08] });
        K.actor('nagi', { x: nx[0], y: nx[1], z: walking ? Math.abs(Math.sin(t * 0.16)) * 0.025 : 0, face: [88, 14.6], extra: BLK });
        const tr = t > 150 ? Math.sin(t * 1.1) * 0.012 : 0;
        K.actor('reo', { x: 84.35 + tr, y: 15.75, face: [86.6, 14.4], anim: 'call_pass', frame: 1, extra: BLK, light: [0.8, 0.72, 0.95] });
        const k = easeIO(t / 300);
        K.cam([lerp(83.35, 83.55, k) + n(0.008), 0.9, lerp(17.0, 16.75, k)], [lerp(86.3, 86.7, k), 0.55, 14.45], lerp(38, 35, k));
      } else {
        const cutAt = 120;
        const offs = [18, 40, 62];
        const nOff = offs.filter((a) => t >= a).length;
        if (t < cutAt) {
          // o Reo sozinho; as luzes do teto apagando uma de cada vez
          const dk = nOff / 3;
          whiteRoom(K, { t, screen: roomScreen(S, t), lights: [4, 3, 2, 1][nOff], amb: K.mix([0.93, 0.95, 0.97], [0.55, 0.58, 0.68], dk), fog: '#aab6c6' });
          K.expo(lerp(0.95, 0.75, dk));
          K.floor({ x0: 85.3, y0: 13.5, x1: 86.7, y1: 14.9, z: 0.014, img: SPOT(), color: '#ffffff', alpha: 0.5 * dk, em: true });
          K.actor('reo', { x: 86, y: 14.2, face: [86, 20], extra: BLK, light: K.mix([1.05, 1.0, 1.1], [0.8, 0.72, 0.95], dk) });
          const k = easeIO(t / cutAt);
          K.cam(mix([86, 0.85, 16.4], [86, 1.25, 19.6], k), [86, lerp(0.62, 0.7, k), 13.9], lerp(36, 46, k));
        } else {
          // o close: os olhos na sombra, os dentes trincados, uma lágrima
          whiteRoom(K, { t, screen: roomScreen(S, t), lights: 1, amb: '#7d7f99', fog: '#3b3f57' });
          K.expo(0.6);
          K.actor('reo', { x: 86, y: 14.2, face: [86.1, 17], extra: BLK, light: [0.75, 0.66, 0.92] });
          const u0 = t - cutAt;
          K.cam([86.12 + n(0.006), 0.72, lerp(17.0, 16.8, easeIO(u0 / 180))], [86, 0.52, 14.2], 30);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.mgmCast();
      if (phase === 0) {
        const intro = 46;
        if (t < intro) {
          introCard(ctx, S, t, intro, { kicker: 'BLUE LOCK', stamp: '2ª SELEÇÃO', size: 86, kickY: 64, stampY: 4, t0: 8, step: 2, glow: 'rgba(56,189,248,0.16)' });
          CE.cineSfx(S, 8, 'abre', () => window.SFX?.whoosh?.());
          return;
        }
        const u = t - intro;
        const ty = (p) => scr(K, p[0], 1.04, p[1]);
        const pr = ty(NR.reo);
        const py = ty(NR.you);
        const pn = ty(NR.nagi);
        CE.mgmHoloTag(ctx, pr.x, pr.y, 'REO MIKAGE', REO_RGB, seg(u, 40, 76), u);
        CE.mgmHoloTag(ctx, py.x, py.y, CE.cinePlayerName(), YOU_RGB, seg(u, 60, 96), u);
        CE.mgmHoloTag(ctx, pn.x, pn.y - 34, 'SEISHIRO NAGI  •  ?', NAGI_RGB, seg(u, 92, 128), u);
        const ka = seg(u, 128, 150);
        if (ka > 0) {
          ctx.save();
          ctx.globalAlpha = ka * (0.6 + 0.4 * Math.sin(u * 0.12));
          ctx.fillStyle = 'rgba(14,165,233,0.85)';
          [-1, 1].forEach((sd) => {
            const x = pn.x + sd * 96;
            const y = pn.y - 80;
            ctx.beginPath();
            ctx.moveTo(x, y - 9);
            ctx.lineTo(x + sd * 16, y);
            ctx.lineTo(x, y + 9);
            ctx.closePath();
            ctx.fill();
          });
          ctx.restore();
        }
        CE.cineDust(ctx, W, H, u, 34, 'rgba(56,189,248,0.55)', 7);
        CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • 2ª SELEÇÃO • A SALA BRANCA', seg(u, 8, 54), '#0ea5e9');
        CE.finKicker(ctx, 40, top + 58, 'O NAGI VAI ESCOLHER COM QUEM SEGUE', seg(u, 40, 90), REO_C);
        CE.cineFlash(ctx, W, H, 1 - seg(t, intro, intro + 28), '#f8fafc');
      } else if (phase === 1) {
        CE.cineGlow(ctx, 160, 420, 520, 'rgba(192,132,252,0.22)');
        CE.cineBokeh(ctx, W, top, bot, t, 14, ['rgba(255,255,255,0.35)', 'rgba(125,211,252,0.3)'], 4);
        // painel: a lembrança do dia em que ele achou o Nagi
        const kp = ease(seg(t, 150, 168));
        if (kp > 0) {
          CE.cineSfx(S, 150, 'page', () => window.SFX?.page?.());
          const x0 = 842;
          const y0 = top + 12;
          const pts = [[x0, y0 + 6], [W - 22, y0], [W - 22, y0 + 250], [x0 + 24, y0 + 260]];
          CE.finPanel(ctx, pts, () => CE.mgmNrMemory(ctx, S, t - 150, x0, y0, W - 22 - x0, 260), { dx: (1 - kp) * 480 });
        }
        CE.finKicker(ctx, 40, top + 30, 'REO MIKAGE', seg(t, 10, 40), REO_C);
      } else if (phase === 2) {
        const choose = 150;
        const wants = t >= choose;
        const kc = seg(t, choose, choose + 40);
        CE.cineGlow(ctx, 0, 380, 520, 'rgba(192,132,252,0.26)', 1 - kc * 0.6);
        CE.cineGlow(ctx, W, 380, 520, 'rgba(45,212,191,0.24)', 0.6 + kc * 0.6);
        // os olhos do Nagi: olham o Reo, depois você... e pela primeira vez, querem
        const look = t < 96 ? -2 : Math.round(lerp(-2, 2, seg(t, 96, 128)));
        const lid = t < choose ? 3 : 3 - Math.min(3, Math.floor(seg(t, choose, choose + 26) * 4));
        eyeStrip(ctx, S, c.nagi, seg(t, 40, 56), {
          x0: 300, x1: 980, y: bot - 112, h: 168, dw: 640, bg: '#0b1220', border: wants ? '#5eead4' : '#f8fafc', vert: true, dir: 1,
          eyesFn: (U, cx, ey) => {
            CE.mgmEyes(ctx, cx, ey, U, { char: c.nagi, iris: wants ? '#0e7490' : '#334155', ring: wants ? '#a5f3fc' : '#94a3b8', look, lid, lidColor: CE.finShade(c.nagi.skinColor, -0.16), shine: wants, glow: wants ? 'rgba(165,243,252,0.3)' : null, glowA: kc });
            const ks = seg(t, choose + 18, choose + 40);
            if (ks > 0 && ks < 1) CE.finSparkle(ctx, cx + 5.4 * U, ey - 1.6 * U, 26, Math.sin(ks * Math.PI), 'rgba(165,243,252,0.8)');
          }
        });
        CE.cineSfx(S, choose, 'quer', () => window.SFX?.blip?.(880));
        // painéis dos lados: o Reo (para quem ele olha primeiro) e você
        const panel = (sd, who, at, rgb) => {
          const kp = ease(seg(t, at, at + 16));
          if (kp <= 0) return;
          const x0 = sd < 0 ? 22 : W - 290;
          const pts = sd < 0 ? [[22, top + 22], [290, top + 30], [282, top + 236], [22, top + 228]] : [[W - 290, top + 30], [W - 22, top + 22], [W - 22, top + 228], [W - 282, top + 236]];
          const chosen = sd > 0 && wants;
          const left = sd < 0 && wants;
          CE.finPanel(ctx, pts, () => {
            CE.cineGradient(ctx, x0, top + 20, 270, 220, [[0, `rgba(${rgb},0.55)`], [1, '#0f172a']]);
            const U = 17.5;
            CE.finCrop(ctx, who, {}, 10.5, 2.5, 15, 11.5, x0 + 4, top + 26, 15 * U, 11.5 * U);
            if (left) {
              ctx.fillStyle = `rgba(15,23,42,${0.62 * kc})`;
              ctx.fillRect(x0, top + 20, 272, 220);
            }
            if (chosen) CE.cineGlow(ctx, x0 + 135, top + 130, 200, 'rgba(45,212,191,0.3)', kc);
          }, { dx: (1 - kp) * sd * 330, border: chosen ? '#5eead4' : left ? '#64748b' : '#f8fafc' });
        };
        panel(-1, c.reo, 16, REO_RGB);
        panel(1, c.you, 104, YOU_RGB);
        CE.rincStamp(ctx, '...EU QUERO.', 640, top + 70, 64, '#e0f2fe', t, choose + 40, 3, 600);
        CE.finKicker(ctx, W / 2, top + 130, 'PELA PRIMEIRA VEZ, O NAGI QUIS ALGUMA COISA', seg(t, choose + 70, choose + 130), '#5eead4', 'center');
      } else if (phase === 3) {
        // a coroa (o sonho dele) desce num painel e racha
        const kc = ease(seg(t, 165, 182));
        if (kc > 0) {
          CE.cineSfx(S, 165, 'painel', () => window.SFX?.page?.());
          CE.cineSfx(S, 195, 'racha', () => window.SFX?.post?.());
          CE.cineSfx(S, 229, 'quebra', () => window.SFX?.tackle?.());
          const x0 = 392;
          const y0 = top + 16;
          const pts = [[x0, y0 + 8], [x0 + 506, y0], [x0 + 496, y0 + 286], [x0 + 10, y0 + 278]];
          CE.finPanel(ctx, pts, () => CE.mgmCrownPanel(ctx, S, t - 165, x0, y0, 506, 286), { dy: (1 - kc) * -440, border: '#fde68a' });
        }
        CE.cineSfx(S, 34, 'passo', () => window.SFX?.pass?.());
        if (t >= 229) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 229, 241)), '#fef3c7');
      } else {
        const cutAt = 120;
        if (t < cutAt) {
          const offs = [18, 40, 62];
          offs.forEach((a, i) => CE.cineSfx(S, a, 'luz' + i, () => window.SFX?.blip?.(140 - i * 20)));
          CE.finKicker(ctx, 40, top + 30, 'SALA BRANCA • DEPOIS DA ESCOLHA', seg(t, 6, 50), '#94a3b8');
          return;
        }
        const u0 = t - cutAt;
        CE.cineGlow(ctx, 600, top + 40, 460, 'rgba(192,132,252,0.18)');
        // os olhos na sombra da franja + a lágrima (faixa dos olhos)
        eyeStrip(ctx, S, c.reo, seg(u0, 0, 14), {
          x0: 20, x1: 860, y: top + 118, h: 190, dw: 800, bg: '#0b0420', border: '#e9d5ff',
          band: { dim: 0.55, dimTint: '20,10,40' },
          eyesFn: (U, cx, ey) => {
            [-1, 1].forEach((sd) => CE.cineGlow(ctx, cx + sd * 3.5 * U, ey, U * 2, 'rgba(192,132,252,0.5)', 0.5 * (1 - seg(u0, 0, 60))));
            ctx.fillStyle = 'rgba(10,4,24,0.55)';
            ctx.fillRect(cx - 8 * U, ey - 2.2 * U, 16 * U, 3.0 * U);
            const tx = Math.round(cx - 3.7 * U);
            const ty = ey + 1.1 * U;
            const len = ease(seg(u0, 22, 100)) * 3.4 * U;
            const pw = Math.ceil(U * 0.42);
            if (len > 0) {
              ctx.fillStyle = 'rgba(186,230,253,0.92)';
              ctx.fillRect(tx, Math.round(ty), pw, Math.round(len));
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.fillRect(tx, Math.round(ty), Math.ceil(pw / 3), Math.round(len));
            }
          }
        });
        // painel: o punho fechado, tremendo
        const kf = ease(seg(u0, 34, 50));
        if (kf > 0) {
          const x0 = W - 300;
          const pts = [[x0, top + 26], [W - 22, top + 20], [W - 22, top + 232], [x0 + 18, top + 240]];
          CE.finPanel(ctx, pts, () => {
            CE.cineGradient(ctx, x0, top + 20, 300, 230, [[0, '#2e1065'], [1, '#0b0420']]);
            ctx.strokeStyle = 'rgba(216,180,254,0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * TAU;
              const cx2 = x0 + 140;
              const cy2 = top + 132;
              ctx.moveTo(cx2 + Math.cos(a) * 92, cy2 + Math.sin(a) * 80);
              ctx.lineTo(cx2 + Math.cos(a) * (130 + (i % 3) * 14), cy2 + Math.sin(a) * (116 + (i % 3) * 12));
            }
            ctx.stroke();
            const sh = Math.round(Math.sin(t * 1.7) * 2);
            CE.mgmPartAt(ctx, CE.mgmFist(c.reo), x0 + 140 - 4 * 21 + sh, top + 134 - 4.1 * 21, 21);
            CE.finFillPat(ctx, 'tone', x0, top + 20, 300, 230, 1);
          }, { dx: (1 - kf) * 340, border: '#e9d5ff' });
        }
        const kt = seg(t, 196, 236);
        if (kt > 0) {
          CE.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.65 * kt})`], [1, `rgba(2,6,23,${0.8 * kt})`]]);
          CE.cineTitleCard(ctx, W, bot - 104, kt, { kicker: 'REO MIKAGE • 2ª SELEÇÃO', title: 'O TESOURO QUE FOI EMBORA', color: REO_C });
        }
        CE.cineSfx(S, 196, 'titulo', () => window.SFX?.kick?.(0.6));
      }
    }
  });
  // a luz que sobra em cima do Reo
  const SPOT = lazy(() =>
    mkCv(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );

  // ==========================================================================
  // 2. OS IRMÃOS ITOSHI — NEVE EM KAMAKURA (praia e rua de neve no vazio)
  // ==========================================================================
  const CAST = {
    saeKid: { outfit: 'casual', clothesColor: '#fb7185' },
    rinKid: { outfit: 'casual', clothesColor: '#2dd4bf' },
    sae: { outfit: 'casual', clothesColor: '#1f2937' },
    rin: { outfit: 'casual', clothesColor: '#1e3a4c' },
    rinCold: { outfit: 'casual', clothesColor: '#1e3a4c', angry: true }
  };
  // ---- a praia (verão, fim de tarde)
  const SAND = lazy(() =>
    mkCv(160, 80, (g, w, h) => {
      g.fillStyle = '#e7bf8a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = rnd(i, 3) < 0.5 ? 'rgba(255,236,200,0.5)' : 'rgba(176,128,80,0.35)';
        g.fillRect(Math.floor(rnd(i, 4) * w), Math.floor(rnd(i, 5) * h), 1, 1);
      }
      // a areia molhada perto da água
      const gr = g.createLinearGradient(0, 0, 0, 14);
      gr.addColorStop(0, 'rgba(150,104,70,0.65)');
      gr.addColorStop(1, 'rgba(150,104,70,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, 14);
    })
  );
  const SEA = lazy(() =>
    mkCv(160, 80, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#5b6fa8');
      gr.addColorStop(0.7, '#3f74a8');
      gr.addColorStop(1, '#58a3b8');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) {
        const y = Math.floor(rnd(i, 7) * h);
        g.fillStyle = y < h * 0.6 ? 'rgba(255,200,140,0.55)' : 'rgba(220,240,255,0.35)';
        g.fillRect(Math.floor(rnd(i, 8) * w), y, 2 + Math.floor(rnd(i, 9) * 6), 1);
      }
    })
  );
  const SUNSET = lazy(() =>
    mkCv(256, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#f08a5d');
      gr.addColorStop(0.6, '#ffc58a');
      gr.addColorStop(1, '#ffe2b0');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff3d6';
      g.beginPath();
      g.arc(170, 46, 10, 0, TAU);
      g.fill();
      // a ilha (Enoshima) e o morro ao longe
      g.fillStyle = '#7a4a5e';
      g.beginPath();
      g.moveTo(40, h);
      g.quadraticCurveTo(70, 40, 104, h);
      g.fill();
      g.fillStyle = '#a0607a';
      g.fillRect(0, h - 3, w, 3);
    })
  );
  function beach(K, t) {
    K.sky('#f39563', '#ffd9a6', 0);
    K.fog('#f6b884', 0.012);
    K.ambient('#ffe0bf');
    K.floor({ x0: 74, y0: 14.6, x1: 98, y1: 26, img: SAND(), color: '#ffffff' });
    K.floor({ x0: 70, y0: 2, x1: 102, y1: 14.6, z: 0.004, img: SEA(), color: '#ffffff' });
    const fy = 14.55 + Math.sin(t * 0.03) * 0.12;
    K.floor({ x0: 70, y0: fy - 0.08, x1: 102, y1: fy + 0.1, z: 0.008, color: '#fff6ec', alpha: 0.55 });
    plate(K, { x: 86, y: 1.5, z: -0.5, w: 46, h: 11.5, ang: Math.PI / 2, img: SUNSET(), color: '#ffffff', em: true });
  }
  // ---- a rua de neve (inverno, noite): casas do lado norte, o poste aceso, a rua
  const SNOW = lazy(() =>
    mkCv(160, 96, (g, w, h) => {
      g.fillStyle = '#c6d3e8';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {
        g.fillStyle = rnd(i, 13) < 0.6 ? 'rgba(240,246,255,0.7)' : 'rgba(120,140,180,0.25)';
        g.fillRect(Math.floor(rnd(i, 14) * w), Math.floor(rnd(i, 15) * h), 1, 1);
      }
      // a rua (pisada, mais escura) com as marcas de pneu
      const y0 = Math.round((15.0 - 13) * 8);
      const y1 = Math.round((17.0 - 13) * 8);
      g.fillStyle = 'rgba(96,112,150,0.35)';
      g.fillRect(0, y0, w, y1 - y0);
      g.fillStyle = 'rgba(70,84,120,0.45)';
      g.fillRect(0, y0 + 4, w, 1);
      g.fillRect(0, y1 - 5, w, 1);
    })
  );
  const FACADE = lazy(() =>
    mkCv(96, 40, (g, w, h) => {
      g.fillStyle = '#2b2f45';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d2033';
      for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1, h);
      // janelas acesas (shoji) e uma porta
      [[10, 12], [34, 12], [62, 12], [80, 12]].forEach(([x, y], i) => {
        const on = i !== 2;
        g.fillStyle = on ? '#ffd27a' : '#3a3f5c';
        g.fillRect(x, y, 12, 10);
        g.fillStyle = on ? '#c99a4a' : '#262a40';
        g.fillRect(x + 5, y, 1, 10);
        g.fillRect(x, y + 4, 12, 1);
      });
      g.fillStyle = '#4a3326';
      g.fillRect(48, 20, 9, 20);
      g.fillStyle = '#e8eef8';
      g.fillRect(0, 0, w, 2);
    })
  );
  const HILLS = lazy(() =>
    mkCv(192, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#121a33';
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, 26 + Math.sin(x * 0.045) * 9 + Math.sin(x * 0.13) * 4);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(214,226,245,0.55)';
      for (let x = 0; x <= w; x += 2) g.fillRect(x, 26 + Math.sin(x * 0.045) * 9 + Math.sin(x * 0.13) * 4, 2, 2);
      g.fillStyle = '#ffd27a';
      for (let i = 0; i < 40; i++) g.fillRect(Math.floor(rnd(i, 21) * w), 44 + Math.floor(rnd(i, 22) * 16), 1, 1);
    })
  );
  const POOL = lazy(() =>
    mkCv(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,214,150,0.95)');
      gr.addColorStop(0.5, 'rgba(255,200,130,0.45)');
      gr.addColorStop(1, 'rgba(255,200,130,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );
  const CONE = lazy(() =>
    mkCv(64, 96, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,220,160,0.75)');
      gr.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w / 2 - 4, 0);
      g.lineTo(w / 2 + 4, 0);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fill();
    })
  );
  const STEP = lazy(() =>
    mkCv(8, 8, (g) => {
      g.fillStyle = 'rgba(46,60,92,0.7)';
      g.beginPath();
      g.ellipse(4, 4, 3.5, 2, 0, 0, TAU);
      g.fill();
    })
  );
  const FLAKE = lazy(() => mkCv(2, 2, (g) => {
    g.fillStyle = '#f1f5ff';
    g.fillRect(0, 0, 2, 2);
  }));
  const LAMP = [87.95, 15.15];
  const SAE_AT = [87.55, 15.85];
  const RIN_AT = [85.5, 16.1];
  // o cenário da rua (o = { dark, tilt })
  function snowStreet(K, t, o = {}) {
    K.sky('#01030b', o.hor || '#1b2a4a', 0.9);
    K.fog(o.fog || '#0e1830', o.fogK ?? 0.045);
    K.ambient(o.amb || '#8ea2cf');
    K.floor({ x0: 76, y0: 13, x1: 96, y1: 25, img: SNOW(), color: '#ffffff' });
    // as casas do lado norte (volumes + fachada + telhado com neve)
    [[77.0, 80.8], [81.1, 85.2], [85.5, 89.0], [89.3, 93.6], [93.9, 97.8], [98.1, 102.4]].forEach(([x0, x1], i) => {
      const y0 = 11.6 - (i % 2) * 0.3;
      const y1 = 13.0;
      const hh = 1.45 + (i % 2) * 0.2;
      K.box({ x0, y0, x1, y1, z1: hh, color: '#262a3e' });
      plate(K, { x: (x0 + x1) / 2, y: y1 + 0.01, w: x1 - x0, h: hh, ang: Math.PI / 2, img: FACADE(), color: '#ffffff', light: [0.95, 0.95, 1.0] });
      K.box({ x0: x0 - 0.15, y0: y0 - 0.1, x1: x1 + 0.15, y1: y1 + 0.35, z0: hh, z1: hh + 0.16, color: '#1a1d2c', top: '#e8eef8' });
    });
    // o outro lado da rua (só mais para o leste, fora do caminho da câmera)
    [[89.8, 93.6], [93.9, 98.2], [98.5, 102.4]].forEach(([x0, x1], i) => {
      const y0 = 18.7;
      const y1 = 20.2;
      const hh = 1.5 + (i % 2) * 0.18;
      K.box({ x0, y0, x1, y1, z1: hh, color: '#262a3e' });
      plate(K, { x: (x0 + x1) / 2, y: y0 - 0.01, w: x1 - x0, h: hh, ang: -Math.PI / 2, img: FACADE(), color: '#ffffff', light: [0.9, 0.9, 0.98] });
      K.box({ x0: x0 - 0.15, y0: y0 - 0.35, x1: x1 + 0.15, y1: y1 + 0.1, z0: hh, z1: hh + 0.16, color: '#1a1d2c', top: '#e8eef8' });
    });
    // o fim da rua: morros com neve e as luzes da cidade lá longe
    plate(K, { x: 104.5, y: 16, w: 16, h: 5, z: -0.2, ang: Math.PI, img: HILLS(), color: '#ffffff', light: [0.9, 0.9, 1.0] });
    plate(K, { x: 86, y: 4.5, w: 40, h: 6, z: -0.2, ang: Math.PI / 2, img: HILLS(), color: '#ffffff', light: [0.85, 0.85, 0.95] });
    // o poste: o pé, o braço, a lâmpada acesa, o cone de luz e a poça de luz na neve
    K.box({ x0: LAMP[0] - 0.05, y0: LAMP[1] - 0.05, x1: LAMP[0] + 0.05, y1: LAMP[1] + 0.05, z1: 1.95, color: '#1e2433' });
    K.box({ x0: LAMP[0] - 0.42, y0: LAMP[1] - 0.04, x1: LAMP[0] + 0.02, y1: LAMP[1] + 0.04, z0: 1.88, z1: 1.94, color: '#1e2433' });
    K.box({ x0: LAMP[0] - 0.5, y0: LAMP[1] - 0.08, x1: LAMP[0] - 0.3, y1: LAMP[1] + 0.08, z0: 1.8, z1: 1.88, color: '#ffe2a8', em: true });
    K.floor({ x0: SAE_AT[0] - 1.6, y0: SAE_AT[1] - 1.3, x1: SAE_AT[0] + 1.6, y1: SAE_AT[1] + 1.3, z: 0.01, img: POOL(), color: '#ffffff', alpha: o.pool ?? 0.85, em: true });
    if (o.eye) {
      const ang = Math.atan2(o.eye[2] - LAMP[1], o.eye[0] - (LAMP[0] - 0.4));
      plate(K, { x: LAMP[0] - 0.4, y: LAMP[1] + 0.3, z: 0.02, w: 2.2, h: 1.8, ang, img: CONE(), color: '#ffffff', alpha: 0.32, em: true });
    }
    // flocos acesos dentro da luz do poste
    for (let i = 0; i < 26; i++) {
      const ph = ((t * (0.004 + rnd(i, 3) * 0.004) + rnd(i, 4)) % 1);
      const z = 1.8 - ph * 1.8;
      const x = LAMP[0] - 0.4 + (rnd(i, 5) - 0.5) * 1.6 * (1 - z / 2.2) + Math.sin(t * 0.02 + i) * 0.08;
      const y = LAMP[1] + 0.3 + (rnd(i, 6) - 0.5) * 1.2;
      K.sprite(FLAKE(), { x, y, z, w: 0.025, h: 0.025, light: [1.4, 1.25, 1.0], alpha: 0.9 });
    }
    // as pegadas do Rin chegando
    const nSteps = o.steps ?? 0;
    for (let i = 0; i < nSteps; i++) {
      const x = 83.2 + i * 0.3;
      if (x > RIN_AT[0] - 0.25) break;
      K.floor({ x0: x - 0.08, y0: 16.05 + (i % 2 ? 0.08 : -0.08), x1: x + 0.08, y1: 16.15 + (i % 2 ? 0.08 : -0.08), z: 0.012, img: STEP(), color: '#ffffff' });
    }
  }
  const SAE_WARM = [1.25, 1.08, 0.9];

  CE.registerCine3D('itoshi_snow', {
    phases: [330, 384, 262, 234, 344, 330],
    music: 'promise',
    title: '❄️ NEVE EM KAMAKURA',
    tags: ['PLANO 1 • A PROMESSA', 'PLANO 2 • ANOS DEPOIS', 'PLANO 3 • O NOSSO SONHO', 'PLANO 4 • ESSE SONHO É SEU', 'PLANO 5 • SOME DA MINHA VIDA', 'PLANO 6 • NEVE EM KAMAKURA'],
    subs: [
      [{ from: 10, who: 'SAE ITOSHI', text: '"Nós dois. A melhor dupla do mundo."', color: SAE_C }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"Eu não vou mais ser atacante. Vou ser meio-campista."', color: SAE_C }],
      [{ from: 10, who: 'RIN ITOSHI', text: '"Mas... e o nosso sonho?"', color: RIN_C }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Esse sonho é seu."', color: SAE_C }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"Você não serve pra mim. Some da minha vida."', color: SAE_C }],
      [{ from: 24, who: 'RIN ITOSHI', text: '"...Então eu vou te destruir, Sae."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase } = S;
      const n = (a, s = 1) => K.noise(S.f * 0.8, s) * a;
      K.expo(1.0);
      if (phase === 0) {
        // verão, a praia de casa: os dois irmãos passando a bola
        const u = Math.max(0, t - 50);
        beach(K, u);
        const sx = [85.15, 17.6];
        const rx = [87.25, 17.6];
        const T = 100;
        const ph = ((u % T) + T) % T;
        const fromSae = ph < T / 2;
        const q = (fromSae ? ph : ph - T / 2) / (T / 2);
        const a = fromSae ? [sx[0] + 0.22, sx[1]] : [rx[0] - 0.2, rx[1]];
        const b = fromSae ? [rx[0] - 0.2, rx[1]] : [sx[0] + 0.22, sx[1]];
        const saeKick = fromSae && ph < 12;
        const rinKick = !fromSae && ph - T / 2 < 12;
        K.actor('sae', { x: sx[0], y: sx[1], face: rx, anim: saeKick ? 'shoot' : 'idle', frame: saeKick ? 1 : undefined, extra: CAST.saeKid, k: 0.74, light: [1.2, 1.05, 0.92] });
        K.actor('rin', { x: rx[0], y: rx[1], face: sx, anim: rinKick ? 'shoot' : 'idle', frame: rinKick ? 1 : undefined, extra: CAST.rinKid, k: 0.66, light: [1.2, 1.05, 0.92] });
        K.ball(lerp(a[0], b[0], q), sx[1] + 0.02, 0.04 + Math.sin(q * Math.PI) * 0.5, { k: 0.6 });
        const kc = easeIO(seg(u, 0, 160));
        const k2 = easeIO(seg(u, 160, 300));
        const eye = mix([87.35, 0.42, 19.1], [86.25, 0.78, 21.3], kc);
        K.cam([eye[0] + n(0.006), eye[1], eye[2] - k2 * 0.4], mix([86.95, 0.34, 17.4], [86.2, 0.42, 15.6], kc), lerp(34, 44, kc) - k2 * 3);
      } else if (phase === 1) {
        // inverno, anos depois: o Sae embaixo do poste; o Rin chega andando
        const kA = easeIO(seg(t, 0, 150));
        const kB = easeIO(seg(t, 150, 372));
        const eye = mix(mix([85.4, 1.05, 21.2], [85.8, 0.98, 20.6], kA), [87.2, 0.84, 18.95], kB);
        const wk = seg(t, 16, 140);
        snowStreet(K, t, { eye, steps: Math.floor(wk * 10) });
        const rk = 1 - Math.pow(1 - wk, 1.7);
        const rp = mix([83.0, 16.1], RIN_AT, rk);
        const walking = wk > 0 && wk < 1;
        K.actor('rin', { x: rp[0], y: rp[1], face: SAE_AT, anim: walking ? 'run' : 'idle', frame: walking ? Math.floor(t / 4) : undefined, extra: CAST.rin, light: [0.82, 0.92, 1.12] });
        K.ball(rp[0] + 0.12, rp[1] + 0.12, walking ? 0.04 : 0.36, { k: 0.6 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: rp, extra: CAST.sae, light: SAE_WARM });
        K.cam([eye[0] + n(0.006), eye[1] + n(0.004, 3), eye[2]], mix(mix([86.0, 0.6, 15.6], [86.4, 0.6, 15.8], kA), [SAE_AT[0], 0.62, SAE_AT[1]], kB), lerp(lerp(44, 42, kA), 32, kB));
      } else if (phase === 2) {
        // o Rin: "Mas... e o nosso sonho?"
        const eye = [87.3, 0.74, 17.8];
        snowStreet(K, t, { eye, steps: 10 });
        const k = easeIO(t / 260);
        const shock = t >= 40;
        K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: SAE_AT, extra: CAST.rin, light: [0.95, 0.98, 1.12] });
        K.ball(RIN_AT[0] + 0.16, RIN_AT[1] + 0.12, 0.36, { k: 0.6 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: RIN_AT, extra: CAST.sae, light: SAE_WARM, alpha: 1 });
        const sh = shock ? 0.004 : 0.002;
        K.cam([lerp(eye[0], 87.1, k) + n(sh), eye[1] + n(sh, 2), lerp(eye[2], 17.55, k)], [RIN_AT[0], 0.56, RIN_AT[1]], 30);
      } else if (phase === 3) {
        // o Sae, frio, embaixo da luz: "Esse sonho é seu."
        const eye = [85.45, 0.72, 17.15];
        snowStreet(K, t, { eye, steps: 10 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: [85.5, 17], extra: CAST.sae, light: [1.12, 0.98, 0.86] });
        const k = easeIO(t / 230);
        K.cam([lerp(eye[0], 85.7, k) + n(0.004), lerp(eye[1], 0.68, k), lerp(eye[2], 16.95, k)], [SAE_AT[0], 0.62, SAE_AT[1]], lerp(32, 29, k));
      } else if (phase === 4) {
        if (t < 130) {
          // por cima do ombro do Rin: o Sae fala, vira as costas e vai embora
          const eye = [84.3, 0.88, 17.2];
          snowStreet(K, t, { eye, steps: 10 });
          const turn = t >= 84;
          const w = easeIO(seg(t, 96, 130));
          const sp = mix(SAE_AT, [90.3, 15.55], w);
          K.actor('sae', { x: sp[0], y: sp[1], face: turn ? [93, 15.4] : RIN_AT, anim: w > 0 && w < 1 ? 'run' : 'idle', frame: w > 0 && w < 1 ? Math.floor(t / 5) : undefined, extra: CAST.sae, light: SAE_WARM });
          K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: sp, extra: CAST.rin, light: [0.5, 0.58, 0.8] });
          K.ball(RIN_AT[0] + 0.16, RIN_AT[1] + 0.12, 0.36, { k: 0.6 });
          K.cam([eye[0] + n(0.006), eye[1], eye[2]], [lerp(87.4, 88.3, w), 0.58, 15.75], 36 - easeIO(t / 130) * 2);
        } else if (t < 200) {
          // a bola cai na neve
          const u = t - 130;
          snowStreet(K, t, { steps: 10, pool: 0.95 });
          const land = 20;
          let bz;
          if (u < land) bz = lerp(0.42, 0.06, (u / land) * (u / land));
          else {
            const b = u - land;
            bz = 0.06 + (b < 14 ? Math.sin((b / 14) * Math.PI) * 0.06 : 0);
          }
          K.ball(85.78, 16.42, bz, { k: 0.6 });
          K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [90, 15.5], extra: CAST.rin, light: [0.5, 0.58, 0.8] });
          // respingos de neve
          if (u >= land) {
            const b = u - land;
            for (let i = 0; i < 16; i++) {
              const a = rnd(i, 41) * TAU;
              const v = 0.006 + rnd(i, 42) * 0.01;
              const z = 0.05 + v * b * 4 - b * b * 0.0009;
              if (z < 0 || b > 40) continue;
              K.sprite(FLAKE(), { x: 85.78 + Math.cos(a) * v * b * 1.6, y: 16.42 + Math.sin(a) * v * b, z, w: 0.03, h: 0.03, light: [1.2, 1.2, 1.25], alpha: 1 - b / 40 });
            }
          }
          const sh = u >= 20 && u < 34 ? 0.02 : 0.003;
          K.cam([85.45 + n(sh), 0.2 + n(sh, 2), 17.05], [85.8, 0.1, 16.42], 32 - easeIO(u / 70) * 3);
        } else {
          // a lembrança congela: a rua escura, a câmera subindo para a luz
          const u = t - 200;
          snowStreet(K, t, { steps: 10, amb: '#55658f', hor: '#0b1222' });
          K.expo(0.6);
          K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [90, 15.5], extra: CAST.rin, light: [0.45, 0.5, 0.7] });
          K.ball(85.78, 16.42, 0.06, { k: 0.6 });
          const k = easeIO(u / 144);
          K.cam([lerp(84.4, 84.6, k), lerp(0.9, 1.1, k), 18.6], [86.6, lerp(0.7, 1.4, k), 15.3], 44);
        }
      } else {
        // o Rin chora... a neve passa... e os olhos esfriam
        const swap = 157;
        const cold = t >= swap;
        const eye = [87.6, 0.74, 16.85];
        snowStreet(K, t, { eye, steps: 10, amb: cold ? '#6f85b8' : '#8ea2cf' });
        const k = easeIO(t / 330);
        K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [eye[0], eye[2]], extra: cold ? CAST.rinCold : CAST.rin, light: cold ? [0.7, 1.15, 1.3] : [0.95, 0.98, 1.1] });
        K.cam([lerp(eye[0], 87.35, k) + n(cold ? 0.003 : 0.006), eye[1] + n(0.003, 2), lerp(eye[2], 16.75, k)], [85.5, 0.52, 16.75], lerp(32, 29, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = CE.mgmCast();
      const snow = (amt = 1, near = true) => CE.mgmSnowLayers(ctx, S, t, amt, near);
      const breath = (p, period, seed, dir, amt) => {
        const q = scr(K, p[0], 0.62, p[1]);
        CE.mgmBreath(ctx, q.x, q.y, t, period, seed, 0.7, dir, amt);
      };
      if (phase === 0) {
        const intro = 50;
        const u = t - intro;
        if (u >= 0) {
          // brilhos na água
          for (let i = 0; i < 8; i++) {
            const per = 40 + rnd(i, 2) * 30;
            const p = ((u + rnd(i, 3) * per) % per) / per;
            const q = scr(K, 84 + rnd(i, 4) * 5, 0.01, 11 + rnd(i, 5) * 3);
            CE.finSparkle(ctx, q.x, q.y, 4 + rnd(i, 6) * 5, Math.sin(p * Math.PI), 'rgba(255,236,170,0.8)');
          }
          const ki = Math.floor(u / 50);
          CE.cineSfx(S, intro + ki * 50, 'chute' + ki, () => window.SFX?.kick?.(0.22));
          CE.mgmMemoryLook(ctx, S, u);
          // painel: os dois rindo
          const kp = ease(seg(u, 166, 184));
          if (kp > 0) {
            CE.cineSfx(S, intro + 166, 'page', () => window.SFX?.page?.());
            const x0 = W - 566;
            const pts = [[x0, top + 12], [W - 24, top + 18], [W - 24, top + 222], [x0 + 18, top + 214]];
            CE.finPanel(ctx, pts, () => {
              CE.cineGradient(ctx, x0, top, 560, 240, [[0, '#f6a25e'], [1, '#8a3b63']]);
              CE.cineGlow(ctx, x0 + 280, top + 70, 260, 'rgba(255,236,170,0.6)');
              const U = 14;
              CE.mgmKidFace(ctx, c.saeKid, x0 + 24, top + 18, U);
              CE.mgmKidFace(ctx, c.rinKid, x0 + 290, top + 30, U * 0.94);
              ctx.fillStyle = 'rgba(255,170,90,0.12)';
              ctx.fillRect(x0, top, 560, 240);
              CE.finFillPat(ctx, 'tone', x0, top, 560, 240, 1);
            }, { dx: (1 - kp) * 620, border: '#fff7ed' });
            CE.mgmBubble(ctx, W - 250, top + 268, 'PROMETIDO!', 26, W - 160, top + 206, seg(u, 200, 214));
            CE.cineSfx(S, intro + 200, 'prometido', () => window.SFX?.jingle?.([72, 76, 79], 0, 'triangle'));
          }
          CE.finKicker(ctx, 40, top + 30, 'A PRAIA DE CASA • VERÃO', seg(u, 8, 50), '#fbbf24');
          CE.finKicker(ctx, 40, top + 58, 'OS IRMÃOS ITOSHI', seg(u, 40, 80), SAE_C);
        }
        // abertura no preto: "muitos anos atrás..."
        if (t < intro + 30) {
          const a = t < intro ? 1 : 1 - seg(t, intro, intro + 30);
          ctx.fillStyle = `rgba(6,3,2,${a})`;
          ctx.fillRect(0, 0, W, H);
          const ka = 1 - seg(t, intro - 6, intro + 10);
          ctx.save();
          ctx.globalAlpha = ka;
          CE.cineGlow(ctx, W / 2, (top + bot) / 2, 320, 'rgba(255,170,90,0.2)', seg(t, 0, 24));
          CE.finKicker(ctx, W / 2, (top + bot) / 2 - 56, 'KAMAKURA', seg(t, 2, 20), '#fbbf24', 'center');
          CE.rincStamp(ctx, 'MUITOS ANOS ATRÁS...', W / 2, (top + bot) / 2 + 6, 58, '#fde68a', t, 8, 2, W * 0.7);
          ctx.restore();
        }
      } else if (phase === 1) {
        const wk = seg(t, 16, 140);
        const rp = mix([83.0, 16.1], RIN_AT, 1 - Math.pow(1 - wk, 1.7));
        breath(SAE_AT, 110, 2, 1, 1);
        breath(rp, 60, 5, -1, wk >= 1 ? 1 : 0.5);
        snow();
        CE.finKicker(ctx, 40, top + 30, 'KAMAKURA • INVERNO • ANOS DEPOIS', seg(t, 8, 54), '#7dd3fc');
        CE.finKicker(ctx, 40, top + 58, 'O SAE VOLTOU DA ESPANHA', seg(t, 40, 86), SAE_C);
      } else if (phase === 2) {
        breath(RIN_AT, 80, 3, 1, 1);
        const shock = t >= 40;
        const look = shock ? [0, 1, 0, -1][Math.floor(t / 3) % 4] : 0;
        eyeStrip(ctx, S, c.rin, seg(t, 34, 48), {
          x0: 20, x1: 700, y: top + 110, h: 170, dw: 640, bg: '#050b1a', border: '#bae6fd',
          band: { dim: 0.22, dimTint: '8,20,44' },
          eyesFn: (U, cx, ey) => CE.mgmEyes(ctx, cx, ey, U, { char: c.rin, iris: '#0f766e', ring: '#5eead4', tiny: shock, look, glow: 'rgba(34,211,238,0.25)', shine: !shock })
        });
        snow(0.8);
        CE.finKicker(ctx, 40, bot - 36, 'RIN ITOSHI', seg(t, 10, 40), RIN_C);
      } else if (phase === 3) {
        const pl = scr(K, LAMP[0] - 0.4, 1.8, LAMP[1]);
        CE.cineShafts(ctx, pl.x, pl.y, Math.PI / 2, 700, 0.8, 6, '255,220,170', 0.07, t);
        breath(SAE_AT, 100, 7, -1, 0.8);
        snow(0.8);
        CE.rincStamp(ctx, 'ESSE SONHO É SEU.', 640, top + 64, 56, '#fbcfe8', t, 34, 2, W * 0.8);
        CE.finKicker(ctx, 40, bot - 36, 'SAE ITOSHI', seg(t, 10, 40), SAE_C);
      } else if (phase === 4) {
        if (t < 130) {
          snow(0.8, false);
          CE.mgmSnow(ctx, W, top - 30, bot + 30, t, 10, 10, 2.4, '240,246,255', 0.5, 31, 0.5, true);
          return;
        }
        if (t < 200) {
          const u = t - 130;
          CE.cineSfx(S, 150, 'bola', () => window.SFX?.kick?.(0.15));
          snow(0.9);
          CE.rincStamp(ctx, '...tum.', 900, 470, 34, '#cbd5e1', u, 24, 3);
          return;
        }
        // a lembrança congela, racha e cai em pedaços (a foto da praia)
        frozenMemory(ctx, S, t - 200);
      } else {
        const swap = 157;
        const cold = t >= swap;
        CE.cineGlow(ctx, W - 80, top + 20, 380, cold ? 'rgba(125,211,252,0.18)' : 'rgba(255,200,130,0.24)');
        breath(RIN_AT, cold ? 120 : 70, 9, 1, cold ? 0.6 : 1);
        // os olhos: molhados → a lágrima congela e o olhar esfria
        eyeStrip(ctx, S, cold ? c.rinCold : c.rin, seg(t, 6, 20), {
          x0: 20, x1: 720, y: top + 116, h: 180, dw: 660, bg: cold ? '#021018' : '#050b1a', border: cold ? '#67e8f9' : '#bae6fd',
          band: cold ? { dim: 0.3, dimTint: '0,24,36' } : { dim: 0.2, dimTint: '8,20,44' },
          eyesFn: (U, cx, ey) => {
            const pw = Math.ceil(U * 0.4);
            [-1, 1].forEach((sd) => {
              const tx = Math.round(cx + sd * 3.5 * U - pw / 2 + sd * 0.6 * U);
              const ty = Math.round(ey + 1.0 * U);
              const len = Math.round(ease(seg(t, 6 + (sd > 0 ? 10 : 0), 70)) * 3.0 * U);
              if (len <= 0) return;
              ctx.fillStyle = cold ? 'rgba(224,242,254,0.55)' : 'rgba(186,230,253,0.9)';
              ctx.fillRect(tx, ty, pw, len);
              ctx.fillStyle = cold ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)';
              ctx.fillRect(tx, ty, Math.ceil(pw / 3), len);
              if (cold) {
                ctx.fillStyle = 'rgba(240,249,255,0.8)';
                ctx.fillRect(tx - Math.round(pw * 0.2), ty + len - pw, Math.round(pw * 1.4), Math.round(pw * 1.2));
              }
            });
            if (!cold) CE.mgmEyes(ctx, cx, ey, U, { char: c.rin, iris: '#0f766e', ring: '#5eead4', look: 0, shine: true, wet: true, glow: 'rgba(34,211,238,0.18)' });
            else CE.mgmEyes(ctx, cx, ey, U, { char: c.rinCold, iris: '#021a1d', ring: '#22d3ee', look: 0, angry: true, line: '#010409', glow: 'rgba(34,211,238,0.55)', glowA: 0.4 + 0.6 * seg(t, swap, swap + 50) });
          }
        });
        if (cold) {
          ctx.fillStyle = `rgba(8,47,73,${0.22 * seg(t, swap, swap + 40)})`;
          ctx.fillRect(0, 0, W, H);
          const fk = seg(t, swap + 10, swap + 120);
          CE.mgmFrostEdges(ctx, 0, top, W, bot - top, fk * 0.7, 120);
          CE.mgmFrost(ctx, 0, top, W, bot - top, fk * 0.2);
        }
        CE.mgmSnow(ctx, W, top, bot, t, 90, 2, 0.9, '214,226,245', 0.5, 41, 0.45);
        CE.mgmSnow(ctx, W, top - 30, bot + 30, t, 12, 10, 2.4, '240,246,255', 0.5, 43, 0.5, true);
        // a rajada de neve que passa (esconde a troca: o choro vira gelo)
        const gk = seg(t, 138, 178);
        if (gk > 0 && gk < 1) {
          const dens = Math.sin(gk * Math.PI);
          ctx.save();
          for (let i = 0; i < 150; i++) {
            const y = top + rnd(i, 51) * (bot - top);
            const sp = 40 + rnd(i, 52) * 60;
            const xx = ((rnd(i, 53) * (W + 600) + (t - 138) * sp) % (W + 600)) - 300;
            ctx.fillStyle = `rgba(226,236,248,${(0.25 + rnd(i, 55) * 0.5) * dens})`;
            ctx.fillRect(xx, y, 60 + rnd(i, 54) * 170, 2 + rnd(i, 56) * 5);
          }
          ctx.fillStyle = `rgba(226,236,248,${0.85 * Math.pow(dens, 3)})`;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 138, 'rajada', () => window.SFX?.whoosh?.());
        const kt = seg(t, 214, 254);
        if (kt > 0) {
          CE.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * kt})`], [1, `rgba(2,6,23,${0.8 * kt})`]]);
          CE.cineTitleCard(ctx, W, bot - 104, kt, { kicker: 'RIN & SAE ITOSHI', title: 'NEVE EM KAMAKURA', color: RIN_C });
        }
        CE.cineSfx(S, 214, 'titulo', () => window.SFX?.kick?.(0.7));
      }
    }
  });

  // A foto da lembrança (a praia) congela, racha e cai em pedaços por cima da rua escura
  // (o mesmo desenho da versão 2D, só que em cima da cena 3D)
  function frozenMemory(ctx, S, u) {
    const { W, H, t, top, bot } = S;
    const PW = 720;
    const PH = 414;
    const crackAt = 56;
    const fallAt = 92;
    ctx.fillStyle = 'rgba(3,7,18,0.45)';
    ctx.fillRect(0, 0, W, H);
    CE.mgmSnow(ctx, W, top, bot, t, 70, 2, 0.8, '214,226,245', 0.45, 33, 0.4);
    const py = (top + bot) / 2 - PH / 2 - 4;
    const kin = ease(seg(u, 0, 18));
    const frost = seg(u, 10, 50);
    const poly = (g, pts) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };
    ctx.save();
    ctx.translate(W / 2, (top + bot) / 2 - 4 + (1 - kin) * 40);
    ctx.rotate(-0.03);
    ctx.globalAlpha = Math.min(1, kin * 2);
    ctx.translate(-PW / 2, -PH / 2);
    CE.cineGlow(ctx, PW / 2, PH / 2, 520, 'rgba(255,190,120,0.25)', 1 - frost);
    const shards = CE.mgmShards(PW, PH, PW * 0.42, PH * 0.47);
    if (!CE._mgmMemSrc) CE._mgmMemSrc = document.createElement('canvas');
    const src = CE._mgmMemSrc;
    const key = `${CE._cineRun}|${S.W}`;
    if (u >= crackAt - 6 && CE._mgmMemKey !== key) {
      src.width = PW;
      src.height = PH;
      const g = src.getContext('2d');
      g.clearRect(0, 0, PW, PH);
      CE.mgmMemPhoto(g, S, 1);
      CE._mgmMemKey = key;
    }
    if (u < crackAt) CE.mgmMemPhoto(ctx, S, frost);
    else {
      const bake = (sh) => {
        if (sh.bakeKey === key) return;
        const [bx, by, bw, bh] = sh.bb;
        const cv = sh.cv || document.createElement('canvas');
        cv.width = bw;
        cv.height = bh;
        const g = cv.getContext('2d');
        g.save();
        g.translate(-bx, -by);
        poly(g, sh.pts);
        g.clip();
        g.drawImage(src, bx, by, bw, bh, bx, by, bw, bh);
        g.restore();
        sh.cv = cv;
        sh.bakeKey = key;
      };
      const drawShard = (sh, dx, dy, rr, dark, edge) => {
        bake(sh);
        ctx.save();
        ctx.translate(sh.cx + dx, sh.cy + dy);
        if (rr) ctx.rotate(rr);
        ctx.translate(-sh.cx, -sh.cy);
        ctx.drawImage(sh.cv, sh.bb[0], sh.bb[1]);
        if (dark > 0 || edge > 0) {
          ctx.beginPath();
          ctx.rect(0, 0, PW, PH);
          ctx.clip();
          poly(ctx, sh.pts);
          if (dark > 0) {
            ctx.fillStyle = `rgba(2,6,23,${dark})`;
            ctx.fill();
          }
          if (edge > 0) {
            ctx.strokeStyle = `rgba(224,242,254,${edge})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        ctx.restore();
      };
      const v = u - crackAt;
      if (u < fallAt) {
        const rings = Math.min(shards.rings, 1 + Math.floor(v / 4));
        const spread = ease(seg(v, 4, 36)) * 3;
        ctx.drawImage(src, 0, 0);
        shards.list.forEach((sh) => {
          if (sh.ring >= rings) return;
          drawShard(sh, sh.vx * spread, sh.vy * spread * 0.5 + spread * 0.4, sh.vr * spread * 0.5, 0, 0);
        });
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, PW, PH);
        ctx.clip();
        CE.drawCracks(ctx, shards, rings);
        ctx.restore();
      } else {
        const f = u - fallAt;
        shards.list.forEach((sh) => {
          const d = Math.max(0, f - (sh.ring * 5 + sh.dl * 8));
          const dx = sh.vx * 3 + sh.vx * d * 1.4;
          const dy = sh.vy * 1.5 + 1.2 + sh.vy * d * 0.5 + 0.11 * d * d;
          if (py + sh.cy + dy - 200 > H) return;
          drawShard(sh, dx, dy, sh.vr * (2 + d * 1.4), Math.min(0.8, d * 0.012), Math.max(0, 0.8 - d * 0.01));
        });
      }
      if (u >= crackAt) CE.cineFlash(ctx, PW, PH, 0.35 * (1 - seg(v, 0, 10)), '#e0f2fe');
    }
    ctx.restore();
    if (u >= crackAt) {
      CE.cineImpactText(ctx, 'CRACK', W - 210, top + 80, 80, '#e0f2fe', seg(u - crackAt, 0, 8), 0, -0.1);
      CE.cineSfx(S, 200 + crackAt, 'gelo', () => window.SFX?.kick?.(1));
      CE.cineSfx(S, 200 + fallAt, 'cai', () => window.SFX?.post?.());
    }
    CE.finKicker(ctx, 40, top + 30, 'A PROMESSA', seg(u, 6, 30), '#fbbf24');
    CE.mgmSnow(ctx, W, top - 30, bot + 30, t, 10, 10, 2.4, '240,246,255', 0.45, 37, 0.5, true);
  }
  void smooth;
  void NAGI_C;
})();
