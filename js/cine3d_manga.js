// ============================================================================
// CUTSCENES EM 3D — momentos do mangá, refeitos no padrão do gol da Sub-20 (js/cine3d_u20.js)
//   nagi_reo_split • no campo do prédio (onde a conversa 'bluelock_holo' acontece): o Reo
//                    estende a mão, o Nagi escolhe você, as luzes do campo apagam em cima do Reo
//   itoshi_snow    • a lembrança do Rin (montada no vazio): a praia de Kamakura no verão e a rua
//                    de neve à noite; a lembrança da praia congela e quebra em pedaços
// Câmera sempre andando, câmera lenta com rampa, closes = quadros de mangá em pixel art (mão,
// punho, coroa, bola, silhueta), pouco texto. Ajudantes em CE._c3b (js/cine3d_selecao2.js).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE._c3b) return;
  const B = CE._c3b;
  const { mkCv, lazy, plate, disc, P, cam, act, shake, remap, W3, stOf, arena, bwBlue, flares, eyesLit, fadeBlack, kick, endTitle, cutin, paper, partAt, RINGH, SPOT, DARK, PIX } = B;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const CA = () => CE.ART;

  const REO_C = '#c084fc';
  const NAGI_C = '#e2e8f0';
  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const NARR_C = '#94a3b8';
  const BLK = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };

  // ==========================================================================
  // 1. NAGI E REO — O TESOURO QUE FOI EMBORA (no meio do campo, depois do jogo)
  // ==========================================================================
  const NR = { reo: P(-1.5, 8.0), nagi: P(0, 7.7), you: P(1.5, 8.0) };
  const NAGI_TO = P(1.02, 8.05);
  const NR_PH = [200, 240, 240, 240, 260];
  const NR3 = (t) => remap(t, [[0, 0], [40, 40], [150, 70], [240, 160]]);

  CE.registerCine3D('nagi_reo_split', {
    phases: NR_PH,
    music: 'mystery',
    title: '👑 O TESOURO QUE FOI EMBORA',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • A ESCOLHA', 'PLANO 2 • VEM COMIGO', 'PLANO 3 • EU QUERO', 'PLANO 4 • A MÃO NO AR', 'PLANO 5 • SOZINHO'],
    subs: [
      [],
      [{ from: 30, to: 236, who: 'REO MIKAGE', text: '"Nagi, vem comigo. A gente começou isso juntos."', color: REO_C }],
      [{ from: 20, to: 236, who: 'SEISHIRO NAGI', text: '"Desculpa, Reo. Eu quero jogar com ele."', color: NAGI_C }],
      [{ from: 16, to: 236, who: 'NARRADOR', text: 'O tesouro do Reo escolheu outro dono.', color: NARR_C }],
      [{ from: 50, to: 180, who: 'REO MIKAGE', text: '"...Vai, então."', color: REO_C }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      arena(K);
      if (phase === 0) {
        // A ESCOLHA: a grua desce no meio do campo; o anel holográfico em volta do Nagi
        disc(K, NR.nagi[0], NR.nagi[1], 0.62, t * 0.012, { img: RINGH(), color: '#0ea5e9', alpha: 0.5 + 0.25 * Math.sin(t * 0.08), em: true });
        disc(K, NR.nagi[0], NR.nagi[1], 0.8, -t * 0.009, { img: RINGH(), color: '#38bdf8', alpha: 0.32, em: true });
        act(K, 'reo', NR.reo, { id: 'reo', face: NR.nagi, extra: BLK, light: [1.08, 1.0, 1.15] });
        act(K, 'nagi', NR.nagi, { id: 'na', face: P(0, 16), extra: BLK });
        act(K, 'you', NR.you, { id: 'y', face: NR.nagi, extra: BLK, light: [0.98, 1.06, 1.08] });
        const k = easeIO(seg(t, 0, 200));
        cam(K, mixP(P(-3.0, 15.2, 4.6), P(-0.55, 11.5, 0.95), k), mixP(P(0, 7.4, 0), P(0, 7.8, 0.5), k), lerp(54, 42, k));
      } else if (phase === 1) {
        // VEM COMIGO: o Reo estende a mão para o Nagi
        disc(K, NR.nagi[0], NR.nagi[1], 0.62, t * 0.012, { img: RINGH(), color: '#0ea5e9', alpha: 0.4, em: true });
        const hand = t > 36;
        act(K, 'reo', NR.reo, { id: 'reo', face: NR.nagi, anim: hand ? 'call_pass' : 'idle', frame: hand ? 1 : undefined, extra: BLK, light: [1.12, 1.0, 1.22] });
        act(K, 'nagi', NR.nagi, { id: 'na', face: NR.reo, extra: BLK, light: [0.88, 0.9, 0.98] });
        act(K, 'you', NR.you, { id: 'y', face: NR.reo, extra: BLK, light: [0.85, 0.9, 0.95] });
        const k = easeIO(t / 240);
        cam(K, shake(K, mixP(P(-0.25, 10.65, 0.7), P(-0.45, 10.35, 0.68), k), f * 0.5, 0.003), mixP(P(-0.95, 7.9, 0.6), P(-0.9, 7.85, 0.6), k), lerp(38, 36, k));
      } else if (phase === 2) {
        // EU QUERO: de frente para o Nagi; ele olha o Reo... e depois você
        const choose = 150;
        const lookAt = t < 96 ? NR.reo : t < 128 ? mixP(NR.reo, NR.you, seg(t, 96, 128)) : NR.you;
        act(K, 'nagi', NR.nagi, { id: 'na', face: [lookAt[0], lookAt[1] + 1.4], extra: BLK, light: K.mix([0.98, 1.0, 1.04], [0.92, 1.15, 1.22], seg(t, choose, choose + 40)), opts: t > choose ? { expr: 'determined' } : undefined });
        act(K, 'reo', NR.reo, { id: 'reo', face: NR.nagi, anim: 'call_pass', frame: 1, extra: BLK, light: [1.05, 0.95, 1.12] });
        act(K, 'you', NR.you, { id: 'y', face: NR.nagi, extra: BLK, light: [0.95, 1.02, 1.04] });
        const a = lerp(-0.28, 0.18, easeIO(seg(t, 20, 230)));
        const r = lerp(3.6, 3.4, easeIO(t / 240));
        cam(K, shake(K, [NR.nagi[0] + Math.sin(a) * r, NR.nagi[1] + Math.cos(a) * r, 0.72], f * 0.5, 0.003), [NR.nagi[0], NR.nagi[1], 0.6], 34);
      } else if (phase === 3) {
        // A MÃO NO AR: o Nagi atravessa (câmera lenta quando passa); a mão do Reo fica no ar
        const A = NR3(t);
        const wk = smooth(seg(A, 30, 120));
        const walking = wk > 0 && wk < 1;
        const np = mixP(NR.nagi, NAGI_TO, wk);
        act(K, 'nagi', np, { id: 'na', face: walking ? NR.you : P(-1, 6), anim: walking ? 'run' : 'idle', frame: walking ? Math.floor(A / 4) : undefined, extra: BLK });
        act(K, 'you', NR.you, { id: 'y', face: np, extra: BLK, light: [0.98, 1.06, 1.08] });
        const tr = t > 150 ? Math.sin(t * 1.1) * 0.01 : 0;
        act(K, 'reo', [NR.reo[0] + tr, NR.reo[1], 0], { id: 'reo', face: NR.nagi, anim: 'call_pass', frame: 1, extra: BLK, light: K.mix([1.05, 0.95, 1.12], [0.78, 0.7, 0.95], seg(t, 120, 220)), opts: t > 150 ? { expr: 'hurt' } : undefined });
        const k = easeIO(t / 240);
        cam(K, shake(K, mixP(P(-1.65, 10.85, 0.3), P(-1.4, 10.6, 0.32), k), f * 0.5, 0.003, 3), mixP(P(-0.65, 7.9, 0.64), P(-0.25, 7.95, 0.6), k), 38);
      } else {
        // SOZINHO: o Nagi e você vão embora; as luzes do campo apagam e só sobra uma em cima do Reo
        const steps = [40, 70, 100].filter((a) => t >= a).length;
        const dk = steps / 3;
        K.expo(lerp(1.0, 0.62, dk));
        K.floor({ x0: NR.reo[0] - 0.9, y0: NR.reo[1] - 0.9, x1: NR.reo[0] + 0.9, y1: NR.reo[1] + 0.9, z: 0.012, img: SPOT(), color: '#e9d5ff', alpha: 0.75 * dk, em: true });
        act(K, 'reo', NR.reo, { id: 'reo', face: P(-1.5, 14), extra: BLK, light: K.mix([1.0, 0.95, 1.05], [0.95, 0.85, 1.15], dk), opts: { expr: 'hurt' } });
        const go = easeIn(seg(t, 0, 140));
        if (go < 1) {
          act(K, 'nagi', mixP(NAGI_TO, P(7.0, 9.6), go), { id: 'na', face: P(8, 9.6), anim: 'run', extra: BLK, light: [0.7, 0.72, 0.8] });
          act(K, 'you', mixP(NR.you, P(7.6, 9.3), go), { id: 'y', face: P(8, 9.3), anim: 'run', extra: BLK, light: [0.7, 0.72, 0.8] });
        }
        const k = easeIO(seg(t, 0, 250));
        cam(K, mixP(P(-1.2, 11.1, 0.75), P(0.6, 14.6, 4.4), k), mixP([NR.reo[0], NR.reo[1], 0.6], [NR.reo[0], NR.reo[1], 0.2], k), lerp(40, 50, k));
        st.reo = W3([NR.reo[0], NR.reo[1], 0.5]);
        st.dk = dk;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      const c = CE.mgmCast ? CE.mgmCast() : null;
      if (phase === 0) {
        flares(ctx, K, S, 0.6);
        kick(ctx, S, 'BLUE LOCK • 2ª SELEÇÃO • A ESCOLHA', seg(t, 16, 50), '#38bdf8');
        fadeBlack(ctx, S, 1 - seg(t, 2, 30));
        CE.cineSfx(S, 10, 'abre', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        // close: a mão aberta do Reo, esperando (quadro reto: momento calmo)
        if (t > 112 && t < 214 && c && CE.mgmArm) {
          const q = seg(t, 112, 214);
          cutin(ctx, [[W * 0.42, top + 24], [W - 24, top + 24], [W - 24, top + 236], [W * 0.42, top + 236]], seg(t, 112, 121), [W * 0.5, 0], (b, g) => {
            paper(g, b, '#ede9fe', 'rgba(88,28,135,0.25)');
            CE.cineGlow(g, b.x + b.w * 0.7, b.y + b.h * 0.5, b.h * 0.6, 'rgba(192,132,252,0.35)', 1);
            partAt(g, CE.mgmArm(c.reo), b.x + b.w * 0.5 - 9.3 * 30 + Math.round(ease(q) * 2) * PIX, b.y + b.h * 0.5 - 2.4 * 30, 30);
          }, { border: '#e9d5ff' });
          CE.cineSfx(S, 112, 'page', () => window.SFX?.page?.());
        }
      } else if (phase === 2) {
        CE.cineSfx(S, 150, 'quer', () => window.SFX?.blip?.(880));
      } else if (phase === 3) {
        // close: a coroa (o sonho do Reo) racha e cai
        if (t > 150 && t < 236 && CE.mgmCrown) {
          const u = t - 150;
          cutin(ctx, [[W * 0.56, top + 24], [W - 24, top + 24], [W - 24, top + 286], [W * 0.56, top + 286]], seg(u, 0, 9), [0, -300], (b, g) => {
            paper(g, b, '#1e1033', 'rgba(192,132,252,0.22)');
            g.save();
            g.imageSmoothingEnabled = false;
            CE.mgmCrown(g, b.x + b.w * 0.5, b.y + b.h * 0.5, 12, seg(u, 10, 34), u > 44 ? u - 44 : -1);
            g.restore();
          }, { border: '#fde68a' });
          CE.cineSfx(S, 160, 'racha', () => window.SFX?.post?.());
          CE.cineSfx(S, 194, 'quebra', () => window.SFX?.tackle?.());
        }
        CE.cineSfx(S, 40, 'passo', () => window.SFX?.pass?.());
      } else {
        // as luzes apagando em degraus (o campo escurece em volta do Reo)
        const dk = st.dk || 0;
        if (st.reo && dk > 0) {
          ctx.save();
          const g = ctx.createRadialGradient(st.reo.x, st.reo.y, 40, st.reo.x, st.reo.y, W * 0.7);
          g.addColorStop(0, 'rgba(2,3,10,0)');
          g.addColorStop(0.3, `rgba(2,3,10,${0.4 * dk})`);
          g.addColorStop(1, `rgba(2,3,10,${0.85 * dk})`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          CE.cineShafts(ctx, st.reo.x, top - 30, Math.PI / 2, Math.max(120, st.reo.y - top + 40), 0.22, 3, '233,213,255', 0.1 * dk, t);
        }
        [40, 70, 100].forEach((a, i) => CE.cineSfx(S, a, 'luz' + i, () => window.SFX?.blip?.(140 - i * 20)));
        // close: o punho fechado, tremendo
        if (t > 118 && t < 196 && c && CE.mgmFist) {
          const sh = Math.round(Math.sin(t * 1.7) * 2) * PIX;
          cutin(ctx, [[W - 360, top + 24], [W - 24, top + 24], [W - 24, top + 318], [W - 360, top + 318]], seg(t, 118, 126), [300, 0], (b, g) => {
            paper(g, b, '#1e1033', 'rgba(192,132,252,0.25)');
            partAt(g, CE.mgmFist(c.reo), b.x + b.w * 0.5 - 4 * 30 + sh, b.y + b.h * 0.5 - 4.1 * 30, 30);
          }, { border: '#e9d5ff' });
        }
        endTitle(ctx, S, seg(t, 196, 222), 'REO MIKAGE • 2ª SELEÇÃO', 'O TESOURO QUE FOI EMBORA', REO_C);
        fadeBlack(ctx, S, seg(t, 236, 260));
        CE.cineSfx(S, 196, 'titulo', () => window.SFX?.kick?.(0.6));
      }
    }
  });

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
      // (a câmera só vê a metade de baixo da placa: o laranja fica perto do horizonte)
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#6d3463');
      gr.addColorStop(0.45, '#d9654a');
      gr.addColorStop(0.75, '#f39a5e');
      gr.addColorStop(1, '#ffc98f');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff1cf';
      g.beginPath();
      g.arc(170, 50, 8, 0, TAU);
      g.fill();
      // a ilha (Enoshima) ao longe
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
    K.sky('#e0704a', '#ffc489', 0);
    K.fog('#f2a873', 0.005);
    K.ambient('#ffe0bf');
    K.floor({ x0: 74, y0: 14.6, x1: 98, y1: 26, img: SAND(), color: '#ffffff' });
    K.floor({ x0: 70, y0: 2, x1: 102, y1: 14.6, z: 0.004, img: SEA(), color: '#ffffff' });
    const fy = 14.55 + Math.sin(t * 0.03) * 0.12;
    K.floor({ x0: 70, y0: fy - 0.08, x1: 102, y1: fy + 0.1, z: 0.008, color: '#fff6ec', alpha: 0.55 });
    plate(K, { x: 86, y: 1.5, z: -0.5, w: 46, h: 11.5, ang: Math.PI / 2, img: SUNSET(), color: '#ffffff', light: [1.3, 1.24, 1.18] }); // (sem brilho próprio: o brilho estourava o pôr do sol em branco)
  }
  // os dois passando a bola na praia (u = tempo da brincadeira)
  const KSAE = [85.15, 17.6];
  const KRIN = [87.25, 17.6];
  function kids(K, u, o = {}) {
    const T = 100;
    const ph = ((u % T) + T) % T;
    const fromSae = ph < T / 2;
    const q = (fromSae ? ph : ph - T / 2) / (T / 2);
    const a = fromSae ? KSAE[0] + 0.22 : KRIN[0] - 0.2;
    const b = fromSae ? KRIN[0] - 0.2 : KSAE[0] + 0.22;
    const saeKick = fromSae && ph < 12;
    const rinKick = !fromSae && ph - T / 2 < 12;
    const light = o.light || [1.2, 1.05, 0.92];
    K.actor('sae', { x: KSAE[0], y: KSAE[1], face: KRIN, anim: saeKick ? 'shoot' : 'idle', frame: saeKick ? 1 : o.frame, extra: CAST.saeKid, k: 0.74, light, opts: { expr: 'happy' } });
    K.actor('rin', { x: KRIN[0], y: KRIN[1], face: KSAE, anim: rinKick ? 'shoot' : 'idle', frame: rinKick ? 1 : o.frame, extra: CAST.rinKid, k: 0.66, light, opts: { expr: 'happy' } });
    K.ball(lerp(a, b, q), KSAE[1] + 0.02, 0.04 + Math.sin(q * Math.PI) * 0.5, { k: 0.6 });
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
  const FLAKE = lazy(() =>
    mkCv(2, 2, (g) => {
      g.fillStyle = '#f1f5ff';
      g.fillRect(0, 0, 2, 2);
    })
  );
  const LAMP = [87.95, 15.15];
  const SAE_AT = [87.55, 15.85];
  const RIN_AT = [85.5, 16.1];
  const BALL_HAND = [85.66, 16.22, 0.36];
  // o cenário da rua (o = { eye, steps, pool, amb, hor })
  function snowStreet(K, t, o = {}) {
    K.sky('#01030b', o.hor || '#1b2a4a', 0.9);
    K.fog(o.fog || '#0e1830', o.fogK ?? 0.045);
    K.ambient(o.amb || '#8ea2cf');
    K.floor({ x0: 76, y0: 13, x1: 96, y1: 25, img: SNOW(), color: '#ffffff' });
    [[77.0, 80.8], [81.1, 85.2], [85.5, 89.0], [89.3, 93.6], [93.9, 97.8], [98.1, 102.4]].forEach(([x0, x1], i) => {
      const y0 = 11.6 - (i % 2) * 0.3;
      const y1 = 13.0;
      const hh = 1.45 + (i % 2) * 0.2;
      K.box({ x0, y0, x1, y1, z1: hh, color: '#262a3e' });
      plate(K, { x: (x0 + x1) / 2, y: y1 + 0.01, w: x1 - x0, h: hh, ang: Math.PI / 2, img: FACADE(), color: '#ffffff', light: [0.95, 0.95, 1.0] });
      K.box({ x0: x0 - 0.15, y0: y0 - 0.1, x1: x1 + 0.15, y1: y1 + 0.35, z0: hh, z1: hh + 0.16, color: '#1a1d2c', top: '#e8eef8' });
    });
    [[89.8, 93.6], [93.9, 98.2], [98.5, 102.4]].forEach(([x0, x1], i) => {
      const y0 = 18.7;
      const y1 = 20.2;
      const hh = 1.5 + (i % 2) * 0.18;
      K.box({ x0, y0, x1, y1, z1: hh, color: '#262a3e' });
      plate(K, { x: (x0 + x1) / 2, y: y0 - 0.01, w: x1 - x0, h: hh, ang: -Math.PI / 2, img: FACADE(), color: '#ffffff', light: [0.9, 0.9, 0.98] });
      K.box({ x0: x0 - 0.15, y0: y0 - 0.35, x1: x1 + 0.15, y1: y1 + 0.1, z0: hh, z1: hh + 0.16, color: '#1a1d2c', top: '#e8eef8' });
    });
    plate(K, { x: 104.5, y: 16, w: 16, h: 5, z: -0.2, ang: Math.PI, img: HILLS(), color: '#ffffff', light: [0.9, 0.9, 1.0] });
    plate(K, { x: 86, y: 4.5, w: 40, h: 6, z: -0.2, ang: Math.PI / 2, img: HILLS(), color: '#ffffff', light: [0.85, 0.85, 0.95] });
    plate(K, { x: 74.5, y: 16, w: 16, h: 5, z: -0.2, ang: 0, img: HILLS(), color: '#ffffff', light: [0.85, 0.85, 0.95] });
    // o poste: o pé, o braço, a lâmpada, o cone de luz e a poça de luz na neve
    K.box({ x0: LAMP[0] - 0.05, y0: LAMP[1] - 0.05, x1: LAMP[0] + 0.05, y1: LAMP[1] + 0.05, z1: 1.95, color: '#1e2433' });
    K.box({ x0: LAMP[0] - 0.42, y0: LAMP[1] - 0.04, x1: LAMP[0] + 0.02, y1: LAMP[1] + 0.04, z0: 1.88, z1: 1.94, color: '#1e2433' });
    K.box({ x0: LAMP[0] - 0.5, y0: LAMP[1] - 0.08, x1: LAMP[0] - 0.3, y1: LAMP[1] + 0.08, z0: 1.8, z1: 1.88, color: '#ffe2a8', em: true });
    K.floor({ x0: SAE_AT[0] - 1.6, y0: SAE_AT[1] - 1.3, x1: SAE_AT[0] + 1.6, y1: SAE_AT[1] + 1.3, z: 0.01, img: POOL(), color: '#ffffff', alpha: o.pool ?? 0.85, em: true });
    if (o.eye) {
      const ang = Math.atan2(o.eye[2] - LAMP[1], o.eye[0] - (LAMP[0] - 0.4));
      plate(K, { x: LAMP[0] - 0.4, y: LAMP[1] + 0.3, z: 0.02, w: 2.2, h: 1.8, ang, img: CONE(), color: '#ffffff', alpha: 0.32 * (o.cone ?? 1), em: true });
    }
    // flocos acesos dentro da luz do poste
    for (let i = 0; i < 26; i++) {
      const ph = (t * (0.004 + rnd(i, 3) * 0.004) + rnd(i, 4)) % 1;
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
  const ccam = (K, e, l, fov) => K.cam(e, l, fov); // (a rua usa [x, altura, y] direto)
  const IS_PH = [300, 320, 240, 220, 340, 300];
  // o plano 5: o Sae vai embora (0-130), a bola cai (130-220), a lembrança quebra (220-340)
  const DROP = 150; // a bola sai das mãos
  const CRACK = 246;
  const SHATTER = 268;
  const isDrop = (t) => remap(t, [[0, 0], [DROP, DROP], [200, DROP + 14], [230, DROP + 44]]);
  // a foto da lembrança (o quadro da praia em preto e branco) guardada para quebrar
  const MEM = { cv: null, key: '' };

  CE.registerCine3D('itoshi_snow', {
    phases: IS_PH,
    music: 'promise',
    title: '❄️ NEVE EM KAMAKURA',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'u20_national',
    tags: ['PLANO 1 • A PROMESSA', 'PLANO 2 • ANOS DEPOIS', 'PLANO 3 • O NOSSO SONHO', 'PLANO 4 • ESSE SONHO É SEU', 'PLANO 5 • SOME DA MINHA VIDA', 'PLANO 6 • NEVE EM KAMAKURA'],
    subs: [
      [{ from: 70, to: 296, who: 'SAE ITOSHI', text: '"Nós dois. A melhor dupla do mundo."', color: SAE_C }],
      [{ from: 160, to: 318, who: 'SAE ITOSHI', text: '"Eu não vou mais ser atacante. Vou ser meio-campista."', color: SAE_C }],
      [{ from: 16, to: 236, who: 'RIN ITOSHI', text: '"Mas... e o nosso sonho?"', color: RIN_C }],
      [{ from: 10, to: 216, who: 'SAE ITOSHI', text: '"Esse sonho é seu."', color: SAE_C }],
      [{ from: 6, to: 140, who: 'SAE ITOSHI', text: '"Você não serve pra mim. Some da minha vida."', color: SAE_C }],
      [{ from: 40, to: 210, who: 'RIN ITOSHI', text: '"...Então eu vou te destruir, Sae."', color: RIN_C }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const n = (a, s = 1) => K.noise(f * 0.8, s) * a;
      K.expo(1.0);
      if (phase === 0) {
        // A PROMESSA: a praia de casa no fim de tarde; a grua sobe devagar
        const u = Math.max(0, t - 30);
        beach(K, u);
        K.expo(0.86);
        kids(K, u);
        const k = easeIO(seg(u, 0, 270));
        const eye = mixP([87.7, 0.42, 20.1], [86.25, 0.92, 21.8], k);
        ccam(K, [eye[0] + n(0.006), eye[1], eye[2]], mixP([86.9, 0.36, 17.5], [86.2, 0.45, 15.8], k), lerp(36, 44, k));
      } else if (phase === 1) {
        // ANOS DEPOIS: a grua desce da luz do poste; o Rin chega andando, o Sae embaixo da luz
        const kA = easeIO(seg(t, 0, 150));
        const kB = easeIO(seg(t, 150, 320));
        const eye = mixP(mixP([85.4, 1.9, 21.6], [85.8, 1.0, 20.6], kA), [87.0, 0.85, 19.35], kB);
        const wk = seg(t, 16, 140);
        snowStreet(K, t, { eye, steps: Math.floor(wk * 10) });
        const rk = 1 - Math.pow(1 - wk, 1.7);
        const rp = mixP([83.0, 16.1], RIN_AT, rk);
        const walking = wk > 0 && wk < 1;
        K.actor('rin', { x: rp[0], y: rp[1], face: SAE_AT, anim: walking ? 'run' : 'idle', frame: walking ? Math.floor(t / 4) : undefined, extra: CAST.rin, light: [0.82, 0.92, 1.12] });
        K.ball(rp[0] + 0.12, rp[1] + 0.12, walking ? 0.04 : 0.36, { k: 0.6 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: rp, extra: CAST.sae, light: SAE_WARM });
        ccam(K, [eye[0] + n(0.006), eye[1] + n(0.004, 3), eye[2]], mixP(mixP([86.4, 1.25, 15.6], [86.4, 0.6, 15.8], kA), [SAE_AT[0], 0.62, SAE_AT[1]], kB), lerp(lerp(46, 42, kA), 34, kB));
        st.rin = W3([rp[0], rp[1], 0.62]);
      } else if (phase === 2) {
        // O NOSSO SONHO: o Rin com a bola nas mãos; a câmera chega devagar
        const k = easeIO(t / 240);
        const eye = mixP([87.45, 0.7, 18.75], [87.2, 0.7, 18.5], k);
        snowStreet(K, t, { eye, steps: 10 });
        K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: SAE_AT, extra: CAST.rin, light: [0.95, 0.98, 1.12], opts: t > 60 ? { expr: 'sweat' } : undefined });
        K.ball(BALL_HAND[0], BALL_HAND[1], BALL_HAND[2], { k: 0.6 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: RIN_AT, extra: CAST.sae, light: SAE_WARM });
        ccam(K, [eye[0] + n(0.004), eye[1] + n(0.003, 2), eye[2]], [RIN_AT[0], 0.56, RIN_AT[1]], 34);
        st.rin = W3([RIN_AT[0], RIN_AT[1], 0.62]);
      } else if (phase === 3) {
        // ESSE SONHO É SEU: o Sae, frio, embaixo da luz; de baixo, chegando
        const k = easeIO(t / 220);
        const eye = mixP([84.9, 0.6, 18.0], [85.15, 0.62, 17.75], k);
        snowStreet(K, t, { eye, steps: 10 });
        K.actor('sae', { x: SAE_AT[0], y: SAE_AT[1], face: [85.0, 17.8], extra: CAST.sae, light: [1.12, 0.98, 0.86] });
        ccam(K, [eye[0] + n(0.004), eye[1], eye[2]], [SAE_AT[0], 0.62, SAE_AT[1]], 34);
        st.sae = W3([SAE_AT[0], SAE_AT[1], 0.62]);
      } else if (phase === 4) {
        if (t < 130) {
          // por trás do Rin, de longe: o Sae fala, vira as costas e vai embora
          const eye = [83.55, 1.0, 18.65];
          snowStreet(K, t, { eye, steps: 10 });
          const turn = t >= 84;
          const w = easeIO(seg(t, 96, 130)) * 0.4;
          const sp = mixP(SAE_AT, [90.3, 15.55], w);
          K.actor('sae', { x: sp[0], y: sp[1], face: turn ? [93, 15.4] : RIN_AT, anim: w > 0 ? 'run' : 'idle', frame: w > 0 ? Math.floor(t / 5) : undefined, extra: CAST.sae, light: SAE_WARM });
          K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: sp, extra: CAST.rin, light: [0.5, 0.58, 0.8] });
          K.ball(BALL_HAND[0], BALL_HAND[1], BALL_HAND[2], { k: 0.6 });
          ccam(K, [eye[0] + n(0.006), eye[1], eye[2]], [lerp(86.9, 87.6, easeIO(seg(t, 90, 130))), 0.6, 15.9], 34 - easeIO(t / 130) * 2);
        } else if (t < 220) {
          // a bola cai das mãos (câmera lenta), o Sae some no fim da rua
          const A = isDrop(t);
          const eye = [87.6, 0.62, 18.9];
          snowStreet(K, t, { eye, steps: 10, pool: 0.9 });
          const sp = mixP([88.9, 15.7], [91.6, 15.5], easeIn(seg(A, 130, 260)));
          K.actor('sae', { x: sp[0], y: sp[1], face: [94, 15.4], anim: 'run', frame: Math.floor(A / 5), extra: CAST.sae, light: [0.8, 0.75, 0.75] });
          K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [90, 15.5], extra: CAST.rin, light: [0.5, 0.58, 0.8] });
          let bz = BALL_HAND[2];
          const land = DROP + 10;
          if (A >= DROP && A < land) bz = lerp(BALL_HAND[2], 0.06, easeIn(seg(A, DROP, land)));
          else if (A >= land) bz = 0.06 + Math.max(0, Math.sin(seg(A, land, land + 12) * Math.PI)) * 0.05;
          K.ball(BALL_HAND[0] + (A >= DROP ? 0.12 * seg(A, DROP, land + 12) : 0), BALL_HAND[1] + (A >= DROP ? 0.2 * seg(A, DROP, land + 12) : 0), bz, { k: 0.6 });
          // respingos de neve no chão
          if (A >= land) {
            const b = A - land;
            for (let i = 0; i < 16; i++) {
              const a = rnd(i, 41) * TAU;
              const v = 0.006 + rnd(i, 42) * 0.01;
              const z = 0.05 + v * b * 4 - b * b * 0.0009;
              if (z < 0 || b > 40) continue;
              K.sprite(FLAKE(), { x: BALL_HAND[0] + 0.12 + Math.cos(a) * v * b * 1.6, y: BALL_HAND[1] + 0.2 + Math.sin(a) * v * b, z, w: 0.03, h: 0.03, light: [1.2, 1.2, 1.25], alpha: 1 - b / 40 });
            }
          }
          const k = easeIO(seg(t, 130, 220));
          ccam(K, [eye[0] + n(0.004), eye[1] - k * 0.3, eye[2]], [lerp(86.4, 85.9, k), lerp(0.55, 0.3, k), 16.2], lerp(36, 32, k));
          st.ballW = W3([BALL_HAND[0] + 0.12, BALL_HAND[1] + 0.2, 0.06]);
          st.A = A;
        } else {
          // a lembrança: a praia parada e sem cor... racha e cai em pedaços sobre a rua escura
          const snap = MEM.key === String(CE._cineRun);
          const beachNow = t < SHATTER || !snap;
          if (beachNow) {
            beach(K, 140);
            kids(K, 140, { light: [1.1, 1.05, 1.0] });
            const k = easeIO(seg(t, 220, SHATTER));
            ccam(K, [lerp(86.6, 86.4, k), 0.7, lerp(20.6, 20.2, k)], [86.2, 0.45, 15.8], 40);
          } else {
            snowStreet(K, t, { steps: 10, amb: '#55658f', hor: '#0b1222', pool: 0.6 });
            K.expo(0.66);
            K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [90, 15.5], extra: CAST.rin, light: [0.45, 0.5, 0.7] });
            K.ball(BALL_HAND[0] + 0.12, BALL_HAND[1] + 0.2, 0.06, { k: 0.6 });
            const k = easeIO(seg(t, SHATTER, 340));
            ccam(K, [lerp(84.2, 84.5, k), lerp(1.0, 1.15, k), 19.0], [86.2, lerp(0.7, 1.0, k), 15.6], 44);
          }
          st.beach = beachNow;
        }
      } else {
        // NEVE EM KAMAKURA: o Rin na contraluz do poste; a rajada de neve e os olhos esfriam
        const k = easeIO(t / 300);
        const eye = mixP([82.55, 0.6, 17.05], [82.8, 0.62, 16.95], k);
        snowStreet(K, t, { eye, steps: 10, amb: t >= 150 ? '#5f74a8' : '#7e92c0', cone: 1.2 });
        K.expo(0.85);
        K.actor('rin', { x: RIN_AT[0], y: RIN_AT[1], face: [eye[0], eye[2]], extra: t >= 150 ? CAST.rinCold : CAST.rin, light: DARK, opts: { expr: 'angry' } });
        ccam(K, [eye[0] + n(0.004), eye[1] + n(0.003, 2), eye[2]], [RIN_AT[0], 0.58, RIN_AT[1]], lerp(36, 34, k));
        st.eyes = W3([RIN_AT[0], RIN_AT[1], 0.74]);
        st.rin = W3([RIN_AT[0], RIN_AT[1], 0.5]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      const c = CE.mgmCast ? CE.mgmCast() : null;
      const snow = (amt = 1, near = true) => CE.mgmSnowLayers && CE.mgmSnowLayers(ctx, S, t, amt, near);
      const breath = (p, period, seed, dir, amt) => {
        if (!p || !CE.mgmBreath) return;
        CE.mgmBreath(ctx, p.x, p.y, t, period, seed, 0.6, dir, amt);
      };
      if (phase === 0) {
        const u = t - 30;
        if (u >= 0) {
          // brilhos na água
          for (let i = 0; i < 8; i++) {
            const per = 40 + rnd(i, 2) * 30;
            const p = ((u + rnd(i, 3) * per) % per) / per;
            const q = K.screen(84 + rnd(i, 4) * 5, 0.01, 11 + rnd(i, 5) * 3);
            if (q) CE.finSparkle(ctx, q.x, q.y, 4 + rnd(i, 6) * 5, Math.sin(p * Math.PI), 'rgba(255,236,170,0.8)');
          }
          const ki = Math.floor(u / 50);
          CE.cineSfx(S, 30 + ki * 50, 'chute' + ki, () => window.SFX?.kick?.(0.22));
        }
        // close: os pés pequenos dos dois passando a bola na areia, contra o sol (quadro reto)
        if (t > 186 && t < 286) {
          const q = seg(t, 186, 286);
          cutin(ctx, [[W * 0.46, top + 22], [W - 24, top + 22], [W - 24, top + 286], [W * 0.46, top + 286]], seg(t, 186, 195), [W * 0.4, 0], (b, g) => {
            const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
            gr.addColorStop(0, '#f08a5d');
            gr.addColorStop(0.55, '#ffc58a');
            gr.addColorStop(0.62, '#e7bf8a');
            gr.addColorStop(1, '#b07a4f');
            g.fillStyle = gr;
            g.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
            g.fillStyle = '#fff3d6';
            g.beginPath();
            g.arc(b.x + b.w * 0.5, b.y + b.h * 0.5, b.h * 0.16, 0, TAU);
            g.fill();
            CA().halftone(g, b.x, b.y + b.h * 0.6, b.w, b.h * 0.4, { color: 'rgba(120,70,40,0.35)', step: 18, from: 'bottom', max: 0.7 });
            const s = b.h * 0.13;
            // (a perna da criança: meia curta, tênis colorido)
            const kick = Math.sin(q * TAU * 2);
            CA().boot(g, b.x + b.w * 0.2, b.y + b.h * 0.86, s, { sock: '#f1c9a5', sock2: '#fecdd3', boot: '#fb7185', ang: 0.25 + Math.max(0, kick) * 0.5 });
            CA().boot(g, b.x + b.w * 0.8, b.y + b.h * 0.86, s * 0.94, { sock: '#f1c9a5', sock2: '#ccfbf1', boot: '#2dd4bf', ang: -0.25 - Math.max(0, -kick) * 0.5, flip: true });
            const bq = (Math.sin(q * TAU * 2 - Math.PI / 2) + 1) / 2;
            CA().ball(g, b.x + b.w * lerp(0.3, 0.7, bq), b.y + b.h * (0.84 - Math.sin(bq * Math.PI) * 0.22), b.h * 0.07, { rot: q * 12 });
          }, { border: '#fff7ed' });
        }
        kick(ctx, S, 'KAMAKURA • VERÃO', seg(t, 46, 80), '#fbbf24');
        // abertura no preto: só o lugar, e a praia aparece
        fadeBlack(ctx, S, 1 - seg(t, 24, 56));
        if (t < 40) CE.finKicker(ctx, W / 2, (top + bot) / 2, 'MUITOS ANOS ATRÁS', seg(t, 2, 18) * (1 - seg(t, 26, 38)), '#fbbf24', 'center');
      } else if (phase === 1) {
        breath(st.rin, 60, 5, -1, 0.7);
        snow(0.8);
        kick(ctx, S, 'KAMAKURA • INVERNO • ANOS DEPOIS', seg(t, 20, 60), '#7dd3fc');
        // a troca: o verão vira neve (um clarão branco curto)
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 16), '#f8fafc');
      } else if (phase === 2) {
        breath(st.rin, 80, 3, 1, 1);
        snow(0.7);
        // close: as mãos segurando a bola (quadro reto)
        if (t > 112 && t < 222 && c && CE.mgmHold) {
          cutin(ctx, [[W - 400, top + 26], [W - 24, top + 26], [W - 24, top + 262], [W - 400, top + 262]], seg(t, 112, 121), [380, 0], (b, g) => {
            paper(g, b, '#0b1426', 'rgba(125,211,252,0.18)');
            // a bola entre as duas mãos (os dedos por cima; as mangas descem para fora do quadro)
            const cx = b.x + b.w * 0.5;
            const cy = b.y + b.h * 0.46;
            const u = 30;
            const r = 2.4 * u;
            CA().ball(g, cx, cy, r, { rot: 0.3 });
            const tr = Math.round(Math.sin(t * 0.9) * 1) * PIX;
            partAt(g, CE.mgmHold(c.rin, false), cx - r - 2.2 * u + tr, cy - 1.7 * u, u);
            partAt(g, CE.mgmHold(c.rin, true), cx + r - 1.2 * u - tr, cy - 1.7 * u, u);
          }, { border: '#bae6fd' });
        }
      } else if (phase === 3) {
        if (st.sae) CE.cineShafts(ctx, st.sae.x, top - 30, Math.PI / 2, Math.max(120, st.sae.y - top + 80), 0.5, 5, '255,220,170', 0.08, t);
        breath(st.sae, 100, 7, -1, 0.8);
        snow(0.8);
      } else if (phase === 4) {
        if (t < 130) {
          snow(0.8, false);
          return;
        }
        if (t < 220) {
          const A = st.A || 0;
          snow(0.6, false);
          // close: a bola afundando na neve (pixel art), na câmera lenta
          if (t > 176 && t < 218) {
            const q = seg(t, 176, 218);
            cutin(ctx, [[W * 0.52, bot - (bot - top) * 0.5], [W - 18, bot - (bot - top) * 0.55], [W - 18, bot - 18], [W * 0.48, bot - 18]], seg(t, 176, 184), [W * 0.4, 0], (b, g) => {
              paper(g, b, '#c6d3e8', 'rgba(30,41,59,0.3)');
              g.fillStyle = '#e8eef8';
              g.fillRect(b.x - 8, b.y + b.h * 0.66, b.w + 16, b.h * 0.4);
              const bx = b.x + b.w * 0.52;
              const by = b.y + b.h * (0.62 + 0.05 * ease(q));
              CA().ball(g, bx, by, b.h * 0.2, { rot: 0.5 });
              g.fillStyle = '#f8fafc';
              g.fillRect(b.x - 8, b.y + b.h * (0.74 + 0.02 * q), b.w + 16, b.h * 0.3);
              for (let i = 0; i < 12; i++) {
                const a = Math.PI + (i / 11) * Math.PI;
                const d = b.h * (0.18 + q * 0.3) * (0.6 + rnd(i, 3) * 0.6);
                g.fillRect(bx + Math.cos(a) * d * 1.4, b.y + b.h * 0.74 + Math.sin(a) * d * (1 - q * 0.5), 12, 12);
              }
            }, { border: '#e0f2fe' });
          }
          CE.cineSfx(S, 176, 'bola', () => window.SFX?.kick?.(0.15));
          void A;
          return;
        }
        // a lembrança congela e quebra
        memoryShatter(ctx, S, K, t);
      } else {
        const fk = seg(t, 150, 220);
        const pl = K.screen(LAMP[0] - 0.4, 1.84, LAMP[1]);
        if (pl) {
          CE.cineGlow(ctx, pl.x, pl.y, 160, 'rgba(255,214,150,0.4)', 0.9);
          CE.cineGlow(ctx, pl.x, pl.y, 40, 'rgba(255,240,210,0.9)', 0.9);
        }
        if (st.rin) CE.cineGlow(ctx, st.rin.x, st.rin.y, 160, 'rgba(255,214,150,0.12)', 0.9);
        if (K.st && K.st.eyes) eyesLit(ctx, K, K.st.eyes.__w, t >= 150 ? 'rgba(34,211,238,0.95)' : 'rgba(125,211,252,0.6)', 0.4 + 0.6 * seg(t, 150, 190));
        // depois da rajada: o frio (azul) toma a imagem
        if (fk > 0) {
          ctx.fillStyle = `rgba(8,47,73,${0.2 * fk})`;
          ctx.fillRect(0, 0, W, H);
        }
        if (CE.mgmSnow) {
          CE.mgmSnow(ctx, W, top, bot, t, 90, 2, 0.9, '214,226,245', 0.5, 41, 0.45);
          CE.mgmSnow(ctx, W, top - 30, bot + 30, t, 12, 10, 2.4, '240,246,255', 0.5, 43, 0.5, true);
        }
        // a rajada de neve que passa (esconde a troca: o choro vira gelo)
        const gk = seg(t, 128, 172);
        if (gk > 0 && gk < 1) {
          const dens = Math.sin(gk * Math.PI);
          ctx.save();
          for (let i = 0; i < 150; i++) {
            const y = top + rnd(i, 51) * (bot - top);
            const sp = 40 + rnd(i, 52) * 60;
            const xx = ((rnd(i, 53) * (W + 600) + (t - 128) * sp) % (W + 600)) - 300;
            ctx.fillStyle = `rgba(226,236,248,${(0.25 + rnd(i, 55) * 0.5) * dens})`;
            ctx.fillRect(xx, y, 60 + rnd(i, 54) * 170, 2 + rnd(i, 56) * 5);
          }
          ctx.fillStyle = `rgba(226,236,248,${0.8 * Math.pow(dens, 3)})`;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineSfx(S, 128, 'rajada', () => window.SFX?.whoosh?.());
        endTitle(ctx, S, seg(t, 214, 240), 'RIN & SAE ITOSHI', 'NEVE EM KAMAKURA', RIN_C);
        fadeBlack(ctx, S, seg(t, 272, 300));
        CE.cineSfx(S, 214, 'titulo', () => window.SFX?.kick?.(0.7));
      }
    }
  });

  // A lembrança da praia (o próprio quadro 3D em preto e branco) racha e cai em pedaços,
  // deixando a rua escura aparecer por trás. O quadro da praia é guardado no último instante.
  function memoryShatter(ctx, S, K, t) {
    const { W, H, top, bot } = S;
    const run = String(CE._cineRun);
    const cx = W * 0.5;
    const cy = (top + bot) / 2;
    const shards = CE.mgmShards ? CE.mgmShards(W, H, cx, cy) : null;
    if (K.st && K.st.beach) {
      // sem cor: a lembrança congelando
      bwBlue(ctx, W, H, seg(t, 220, 240));
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(224,242,254,${0.5 * seg(t, 226, 260)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // guarda o quadro (para virar os pedaços)
      if (t >= SHATTER - 10 || MEM.key !== run) {
        if (!MEM.cv) MEM.cv = document.createElement('canvas');
        if (MEM.cv.width !== W || MEM.cv.height !== H) {
          MEM.cv.width = W;
          MEM.cv.height = H;
        }
        const g = MEM.cv.getContext('2d');
        g.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, W, H);
        MEM.key = run;
        MEM.bake = null;
      }
      if (shards && t >= CRACK) {
        const rings = Math.min(shards.rings, 1 + Math.floor((t - CRACK) / 4));
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, W, bot - top);
        ctx.clip();
        CE.drawCracks(ctx, shards, rings);
        ctx.restore();
        CE.cineSfx(S, CRACK, 'gelo', () => window.SFX?.post?.());
      }
      if (CE.mgmSnow) CE.mgmSnow(ctx, W, top, bot, t, 40, 2, 0.6, '214,226,245', 0.4, 33, 0.4);
      return;
    }
    // os pedaços caindo
    if (!shards || !MEM.cv) return;
    const f = t - SHATTER;
    const bakeKey = run + '|' + W;
    if (MEM.bake !== bakeKey) {
      shards.list.forEach((sh) => {
        const [bx, by, bw, bh] = sh.bb;
        const cv = sh.cvB || document.createElement('canvas');
        cv.width = bw;
        cv.height = bh;
        const g = cv.getContext('2d');
        g.save();
        g.translate(-bx, -by);
        g.beginPath();
        sh.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.clip();
        g.drawImage(MEM.cv, bx, by, bw, bh, bx, by, bw, bh);
        g.restore();
        sh.cvB = cv;
      });
      MEM.bake = bakeKey;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, W, bot - top);
    ctx.clip();
    shards.list.forEach((sh) => {
      const d = Math.max(0, f - (sh.ring * 4 + sh.dl * 8));
      const dx = sh.vx * 3 + sh.vx * d * 1.4;
      const dy = sh.vy * 1.5 + 1.2 + sh.vy * d * 0.5 + 0.13 * d * d;
      if (sh.cy + dy - 300 > H) return;
      ctx.save();
      ctx.translate(sh.cx + dx, sh.cy + dy);
      ctx.rotate(sh.vr * (2 + d * 1.4));
      ctx.translate(-sh.cx, -sh.cy);
      ctx.drawImage(sh.cvB, sh.bb[0], sh.bb[1]);
      ctx.beginPath();
      sh.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = `rgba(2,6,23,${Math.min(0.7, d * 0.012)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(224,242,254,${Math.max(0, 0.8 - d * 0.01)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
    CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(f, 0, 8)), '#e0f2fe');
    CE.cineImpactText(ctx, 'CRACK', W - 210, top + 80, 80, '#e0f2fe', seg(f, 0, 8), 0, -0.1);
    CE.cineSfx(S, SHATTER, 'cai', () => window.SFX?.kick?.(1));
    if (CE.mgmSnow) CE.mgmSnow(ctx, W, top - 30, bot + 30, t, 10, 10, 2.4, '240,246,255', 0.45, 37, 0.5, true);
  }
})();
