// ============================================================================
// 63 · duo_final — "Duas sombras, uma só" (CUTSCENE_STYLE §6, conceito A do lote 1)
// Modo Dupla ("Projeto Elo", lore original do jogo), último capítulo: a final da Liga dos
// Pares contra Shion e Haru, em Lisboa, 2 × 2, último lance. Depois desta cena o narrador
// conta o lance conforme a escolha (eu+passo, eu+eu, passo+passo), o Ego, o diretor e o fim.
// Assinatura: as sombras dos dois no gramado claro, debaixo dos quatro refletores. Elas
// correm separadas, vão se aproximando a cena inteira e viram uma sombra só no gol.
// Pico: o quadro de impacto no chute (um só). A cena lê a escolha "final" da dupla e mostra
// o lance certo; sem a escolha (REVER, teste), os dois chegam juntos e chutam juntos.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, rnd, tela } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const TAU = Math.PI * 2;

  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const SHION_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  const HARU_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#dc2626' };
  const GOLD = '#fde047';
  // as torres dos refletores nos cantos do campo; a do nordeste é a que manda nas sombras
  // (vistas de trás, elas descem na diagonal para a esquerda da tela)
  const TORRES = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const MESTRA = TORRES[1];
  const GOL = [53.15, 6.55];

  // ---------------------------------------------------------------- o elenco
  let ELENCO = null;
  function elenco() {
    const run = CE._cineRun || 0;
    if (ELENCO && ELENCO.run === run) return ELENCO;
    let c = null;
    try {
      c = CE.duoCast ? CE.duoCast(ELO, ELO) : null;
    } catch (e) {
      c = null;
    }
    const prof = (window.App && window.App.state && window.App.state.profile) || {};
    const a = (c && c.a) || Object.assign({ skinColor: '#f3d1b8', hairStyle: 'spiky_tall' }, prof, ELO, { name: 'duo_a' });
    const b = (c && c.b) || Object.assign({ name: 'duo_b', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 }, ELO);
    ELENCO = { run, a, b, fim: desfecho() };
    return ELENCO;
  }
  // a escolha da dupla para o último lance: { tipo: 'eu+passo' | 'eu+eu' | 'passo+passo',
  // chuta: 'a' | 'b' (no eu+passo, quem disse "eu chuto") } ou null (sem escolha)
  function desfecho() {
    try {
      const DC = window.DuoCareer;
      if (!DC || !DC.career) return null;
      const flags = Object.assign({}, DC.career.flags, DC.story && DC.story.delta && DC.story.delta.flags);
      const tipo = flags.final;
      if (!tipo) return null;
      let chuta = 'a';
      if (tipo === 'eu+passo') {
        const picks = (DC.story && DC.story.picks && DC.story.picks.elo15_ultimo) || (DC.career.picks && DC.career.picks.elo15_ultimo) || {};
        const pa = DC.slotPid ? DC.slotPid(DC.career, 'a') : null;
        chuta = pa && picks[pa] === 'passo' ? 'b' : 'a';
      }
      return { tipo, chuta };
    } catch (e) {
      return null;
    }
  }
  const dupla = (K, lado, o) => {
    const E = elenco();
    return K.actor(E[lado], Object.assign({ id: 'duo_' + lado, extra: Object.assign({ duoSide: lado }, ELO), k: 0.9 }, o));
  };
  const passo = (f, sp = 3) => 1 + (Math.floor(f / sp) % 4) * 4;

  // ---------------------------------------------------------------- as sombras (a assinatura)
  const sombraCv = () =>
    tela('c63|sombra', 64, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(0,0,0,0.75)');
      gr.addColorStop(0.6, 'rgba(0,0,0,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(32, 64, 30, 62, 0, 0, TAU);
      g.fill();
    });
  // uma sombra comprida no chão, de (x, y) na direção ang (placa deitada, girada)
  function sombra(K, x, y, len, ang, w, a) {
    if (a <= 0.01) return;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = -dy;
    const py = dx;
    const h = 0.03;
    const q0 = [x - px * w * 0.5, h, y - py * w * 0.5];
    const q1 = [x + px * w * 0.5, h, y + py * w * 0.5];
    const q2 = [x + dx * len + px * w * 0.4, h, y + dy * len + py * w * 0.4];
    const q3 = [x + dx * len - px * w * 0.4, h, y + dy * len - py * w * 0.4];
    const V = (p, u, v) => [p[0], p[1], p[2], u, v, 0, 1, 0];
    K._push([].concat(V(q0, 0, 0.5), V(q1, 1, 0.5), V(q2, 1, 1), V(q0, 0, 0.5), V(q2, 1, 1), V(q3, 0, 1)), { img: sombraCv(), color: '#000000', alpha: a });
  }
  // as sombras de um jogador: três fracas (das outras torres) e a comprida, da torre mestra
  function sombras(K, x, y, o = {}) {
    TORRES.forEach((tw) => {
      if (tw === MESTRA) return;
      sombra(K, x, y, 0.8, Math.atan2(y - tw[1], x - tw[0]), 0.26, 0.28);
    });
    if (o.mestra !== false) sombra(K, x, y, o.len || 2.6, Math.atan2(y - MESTRA[1], x - MESTRA[0]), o.w || 0.36, o.a || 0.85);
  }
  // as sombras compridas dos dois: separadas → uma só (junta = 0..1)
  function sombrasDosDois(K, pa, pb, junta) {
    const ang = (p) => Math.atan2(p[1] - MESTRA[1], p[0] - MESTRA[0]);
    const m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    if (junta < 1) {
      [pa, pb].forEach((p) => {
        const q = [lerp(p[0], m[0], junta), lerp(p[1], m[1], junta)];
        sombra(K, q[0], q[1], 2.6 + junta * 0.4, lerp(ang(p), ang(m), junta), 0.36, 0.92 * (1 - junta * 0.5));
      });
    }
    if (junta > 0) sombra(K, m[0], m[1], 3.0 + junta * 0.5, ang(m), 0.36 + 0.3 * junta, 0.98 * junta);
    [pa, pb].forEach((p) => sombras(K, p[0], p[1], { mestra: false }));
  }

  // ---------------------------------------------------------------- o lance
  // posições [x, y] por plano: A pela esquerda (oeste), B pela direita (leste), atacando o
  // gol norte (y 6,6). Shion marca A, Haru marca B, o goleiro no gol.
  const P = {
    p1: { a: [[50.5, 17.6], [51.4, 14.6]], b: [[55.7, 17.9], [55.0, 14.8]], sh: [[52.1, 11.8], [52.0, 12.6]], ha: [[54.7, 11.4], [54.6, 12.3]] },
    p2: { a: [[51.4, 14.6], [52.0, 12.4]], b: [[55.0, 14.8], [54.35, 12.5]], sh: [[52.0, 12.6], [52.25, 11.7]], ha: [[54.6, 12.3], [54.4, 11.6]] },
    p3: { a: [[52.0, 12.4], [52.72, 10.35]], b: [[54.35, 12.5], [53.42, 10.3]], sh: [[52.25, 11.7], [51.6, 11.9]], ha: [[54.4, 11.6], [55.0, 11.5]] }
  };
  const lp = (seg2, k) => [lerp(seg2[0][0], seg2[1][0], k), lerp(seg2[0][1], seg2[1][1], k)];
  const BOLA_PE = (p, adiante = 0.24) => [p[0] + 0.05, p[1] - adiante];
  const GK0 = [53.0, 7.25];

  function campo(K) {
    K.sky('#050a1e', '#1a2a5e', 0.5);
  }
  function defensores(K, sh, ha, o = {}) {
    K.actor('elo_shion', { id: 'shion', extra: SHION_KIT, x: sh[0], y: sh[1], face: o.shFace || [sh[0], 20], anim: o.shAnim || 'idle', frame: o.shFrame, opts: o.shOpts, light: [1.0, 0.98, 1.0] });
    K.actor('elo_haru', { id: 'haru', extra: HARU_KIT, x: ha[0], y: ha[1], face: o.haFace || [ha[0], 20], anim: o.haAnim || 'idle', frame: o.haFrame, opts: o.haOpts, light: [1.0, 0.98, 1.0] });
    sombras(K, sh[0], sh[1], { a: 0.42 });
    sombras(K, ha[0], ha[1], { a: 0.42 });
  }
  function goleiro(K, p, o = {}) {
    K.actor('elo_gk_final', { id: 'gk', x: p[0], y: p[1], z: o.z || 0, face: [53, 20], anim: o.anim || 'idle', frame: o.frame, opts: o.opts, light: [1.0, 0.98, 1.0] });
    sombras(K, p[0], p[1], { a: 0.4 });
  }
  // um plano de corrida: os dois vindo, a bola no pé de A
  function corrida(K, S, pl) {
    const k = R.curvas.easeIO(seg(S.A, 0, S.dur));
    const pa = lp(pl.a, k);
    const pb = lp(pl.b, k);
    const sh = lp(pl.sh, k);
    const ha = lp(pl.ha, k);
    dupla(K, 'a', { x: pa[0], y: pa[1], ang: -Math.PI / 2 + 0.25, anim: 'run', frame: passo(S.f), light: [1.08, 1.05, 1.0] });
    dupla(K, 'b', { x: pb[0], y: pb[1], ang: -Math.PI / 2 - 0.25, anim: 'run', frame: passo(S.f + 2), light: [1.08, 1.05, 1.0] });
    const bp = BOLA_PE(pa, 0.22 + Math.abs(Math.sin(S.f * 0.2)) * 0.08);
    K.ball(bp[0], bp[1], 0.05);
    return { pa, pb, sh, ha };
  }

  // o último lance (tempo da ação a; CHUTE = quando a bola sai pro gol)
  const CHUTE = 96;
  const LENTO4 = { em: 70, ate: 190, fator: 0.26, rampa: 22 };
  const CHUTE_REAL = (() => {
    for (let t = 0; t < 400; t++) if (R.acao(LENTO4, t) >= CHUTE) return t;
    return 140;
  })();
  function lance(K, S) {
    const E = elenco();
    const tipo = E.fim ? E.fim.tipo : 'juntos';
    const A = S.A;
    const pa0 = P.p3.a[1];
    const pb0 = P.p3.b[1];
    let pa = pa0;
    let pb = pb0;
    let bola = BOLA_PE(pa0);
    let animA = 'run';
    let animB = 'run';
    let gk = GK0;
    let gkAnim = 'idle';
    let gkZ = 0;
    const encontro = [53.08, 9.55];
    if (tipo === 'passo+passo') {
      // A toca para B, B devolve, e A empurra para o gol vazio (o goleiro caiu para o lado)
      const p1 = 30;
      const p2 = 62;
      pa = lp([pa0, [52.85, 9.4]], seg(A, 0, CHUTE));
      pb = lp([pb0, [53.4, 9.75]], seg(A, 0, p2));
      if (A < p1) bola = BOLA_PE(lp([pa0, [52.85, 9.4]], seg(A, 0, CHUTE)));
      else if (A < p1 + 14) bola = lp([BOLA_PE(pa0), [pb[0] - 0.12, pb[1] - 0.2]], seg(A, p1, p1 + 14));
      else if (A < p2) bola = [pb[0] - 0.12, pb[1] - 0.2];
      else if (A < p2 + 16) bola = lp([[pb[0] - 0.12, pb[1] - 0.2], [pa[0] + 0.05, pa[1] - 0.22]], seg(A, p2, p2 + 16));
      else bola = [pa[0] + 0.05, pa[1] - 0.22];
      animB = A > p2 - 4 && A < p2 + 6 ? 'shoot' : A > p2 ? 'idle' : 'run';
      animA = A > CHUTE - 4 && A < CHUTE + 10 ? 'shoot' : A > CHUTE ? 'idle' : 'run';
      // o goleiro vai na primeira bola e cai para o lado errado
      const mergulho = seg(A, p1 + 6, p1 + 30);
      gk = [lerp(GK0[0], 54.1, mergulho), GK0[1]];
      gkAnim = mergulho > 0 ? 'dive' : 'idle';
      gkZ = Math.sin(mergulho * Math.PI) * 0.18;
    } else if (tipo === 'eu+passo') {
      // quem passa toca de lado sem olhar; quem chuta pega de primeira
      const chutaA = E.fim.chuta === 'a';
      const PASSE = 60;
      const ps = chutaA ? pb0 : pa0;
      const pc = chutaA ? pa0 : pb0;
      const alvoC = chutaA ? [52.9, 9.5] : [53.25, 9.5];
      const passa = lp([ps, [ps[0] + (chutaA ? -0.3 : 0.3), ps[1] - 0.5]], seg(A, 0, CHUTE));
      const chuta = lp([pc, alvoC], seg(A, 0, CHUTE));
      if (A < PASSE) bola = [passa[0] + (chutaA ? -0.08 : 0.08), passa[1] - 0.24];
      else bola = lp([[passa[0] + (chutaA ? -0.08 : 0.08), passa[1] - 0.24], [chuta[0] + (chutaA ? 0.1 : -0.1), chuta[1] - 0.2]], seg(A, PASSE, CHUTE));
      const animP = A > PASSE - 4 && A < PASSE + 8 ? 'shoot' : A > PASSE ? 'idle' : 'run';
      const animC = A > CHUTE - 6 && A < CHUTE + 12 ? 'shoot' : A > CHUTE ? 'idle' : 'run';
      if (chutaA) {
        pa = chuta;
        pb = passa;
        animA = animC;
        animB = animP;
      } else {
        pa = passa;
        pb = chuta;
        animA = animP;
        animB = animC;
      }
      const vai = seg(A, CHUTE, CHUTE + 20);
      gk = [lerp(GK0[0], 52.4, vai), GK0[1]];
      gkAnim = vai > 0 ? 'dive' : 'idle';
      gkZ = Math.sin(vai * Math.PI) * 0.2;
    } else {
      // eu+eu (e o comum, sem escolha): os dois chegam na bola no mesmo segundo e chutam
      pa = lp([pa0, [encontro[0] - 0.27, encontro[1] + 0.08]], seg(A, 0, CHUTE));
      pb = lp([pb0, [encontro[0] + 0.27, encontro[1] + 0.08]], seg(A, 0, CHUTE));
      bola = lp([BOLA_PE(pa0), [encontro[0], encontro[1] - 0.18]], seg(A, 0, CHUTE));
      animA = animB = A > CHUTE - 6 && A < CHUTE + 12 ? 'shoot' : A > CHUTE ? 'idle' : 'run';
      const vai = seg(A, CHUTE, CHUTE + 20);
      gk = [lerp(GK0[0], 53.9, vai), GK0[1]];
      gkAnim = vai > 0 ? 'dive' : 'idle';
      gkZ = Math.sin(vai * Math.PI) * 0.2;
    }
    // o chute: a bola vai para o gol (canto) e entra
    if (A >= CHUTE) {
      const q = seg(A, CHUTE, CHUTE + 26);
      const de = bola;
      bola = [lerp(de[0], GOL[0] + (tipo === 'eu+passo' ? 0.45 : -0.42), q), lerp(de[1], GOL[1] - 0.15, q), 0.06 + Math.sin(q * Math.PI) * 0.35 + q * 0.12];
    }
    const faceGol = [53, 6];
    dupla(K, 'a', { x: pa[0], y: pa[1], face: faceGol, anim: animA, frame: animA === 'run' ? passo(Math.floor(S.A)) : animA === 'shoot' ? 5 : 0, light: [1.1, 1.06, 1.0] });
    dupla(K, 'b', { x: pb[0], y: pb[1], face: faceGol, anim: animB, frame: animB === 'run' ? passo(Math.floor(S.A) + 2) : animB === 'shoot' ? 5 : 0, light: [1.1, 1.06, 1.0] });
    K.ball(bola[0], bola[1], bola[2] || 0.05);
    goleiro(K, gk, { anim: gkAnim, z: gkZ, opts: gkAnim === 'dive' ? { animTime: 18 } : undefined });
    return { pa, pb, bola };
  }

  // ---------------------------------------------------------------- textos e efeitos 2D
  const placar = (ctx, S, ela, k = 1) => {
    if (CE.ptdScore) CE.ptdScore(ctx, S.W - 410 * (S.W / 1280), S.top + 18, { hl: 'ELO', al: 'S&H', hs: ela, as: 2, minute: "90+3'", hc: GOLD, ac: '#ef4444', k });
  };
  // os flashes e as luzinhas da torcida lotada (celulares) na arquibancada, no 2D
  function torcida(ctx, S, n, forca) {
    const { W, top, stageH } = S;
    for (let i = 0; i < n; i++) {
      const per = 40 + rnd(i, 5) * 60;
      const u = (S.f + rnd(i, 6) * per) % per;
      if (u > 5) continue;
      const x = rnd(i + Math.floor((S.f + rnd(i, 6) * per) / per) * 3, 7) * W;
      const y = top + rnd(i, 8) * stageH * 0.3;
      CE.finSparkle(ctx, x, y, 7 * (W / 1280), (1 - u / 5) * forca);
    }
  }

  R('duo_final', {
    titulo: 'DOIS EGOS, UM GOL',
    musica: 'epic',
    tema: 'worldcup_final',
    grao: 0.05,
    vinheta: 0.45,
    cenario(K) {
      campo(K);
    },
    planos: [
      {
        // de cima e de lado: os dois correndo separados, cada um com as suas sombras
        id: 'separados',
        dur: 230,
        expo: 1.04,
        cam: { de: [[54.4, 4.6, 21.4], [53.0, 0.2, 14.6], 50], para: [[54.25, 4.3, 20.4], [53.0, 0.2, 13.8], 48], curva: 'suave' },
        cena(K, S) {
          const r = corrida(K, S, P.p1);
          sombrasDosDois(K, r.pa, r.pb, 0);
          defensores(K, r.sh, r.ha, { shFace: r.pa, haFace: r.pb });
          goleiro(K, GK0);
        },
        sobre(ctx, S) {
          placar(ctx, S, 2, seg(S.t, 4, 18));
          torcida(ctx, S, 10, 0.7);
        },
        falas: [{ em: 12, quem: 'NARRADOR', texto: 'Final da Liga dos Pares. 2 a 2. Último lance.' }],
        letreiros: [{ em: 10, texto: 'LISBOA • FINAL DA LIGA DOS PARES', cor: GOLD }]
      },
      {
        // a câmera acompanha de lado: as duas sombras compridas vão se aproximando
        id: 'aproxima',
        dur: 190,
        expo: 1.04,
        cam: { de: [[54.25, 4.0, 18.4], [53.1, 0.25, 12.8], 46], para: [[54.1, 3.8, 17.6], [53.1, 0.25, 11.9], 44], curva: 'suave' },
        cena(K, S) {
          const r = corrida(K, S, P.p2);
          sombrasDosDois(K, r.pa, r.pb, 0.15 * seg(S.t, 0, S.dur));
          defensores(K, r.sh, r.ha, { shFace: r.pa, haFace: r.pb });
          goleiro(K, GK0);
        },
        sobre(ctx, S) {
          placar(ctx, S, 2);
          torcida(ctx, S, 8, 0.6);
        }
      },
      {
        // o Shion e o Haru ficam para trás; as sombras quase se tocam
        id: 'passam',
        dur: 180,
        expo: 1.04,
        cam: { de: [[54.1, 3.6, 16.2], [53.1, 0.3, 11.0], 44], para: [[54.0, 3.4, 15.6], [53.1, 0.3, 10.4], 42], curva: 'suave' },
        cena(K, S) {
          const r = corrida(K, S, P.p3);
          sombrasDosDois(K, r.pa, r.pb, 0.15 + 0.35 * seg(S.t, 0, S.dur));
          const caiSh = seg(S.t, 60, 100);
          const caiHa = seg(S.t, 80, 120);
          defensores(K, r.sh, r.ha, { shFace: r.pa, haFace: r.pb, shAnim: caiSh > 0 ? 'stun' : 'idle', haAnim: caiHa > 0 ? 'stun' : 'idle' });
          goleiro(K, GK0);
        },
        sobre(ctx, S) {
          placar(ctx, S, 2);
          torcida(ctx, S, 8, 0.6);
        }
      },
      {
        // o último lance, em câmera lenta: o lance da escolha da dupla; no chute, o quadro de
        // impacto e as duas sombras viram uma só
        id: 'lance',
        dur: 240,
        expo: 1.06,
        lento: LENTO4,
        cam: { de: [[53.95, 3.2, 14.1], [53.05, 0.3, 9.4], 42], para: [[53.9, 3.4, 13.8], [53.05, 0.28, 8.8], 44], curva: 'suave' },
        cena(K, S) {
          const r = lance(K, S);
          const junta = 0.5 + 0.5 * R.curvas.ease(seg(S.A, CHUTE - 30, CHUTE));
          sombrasDosDois(K, r.pa, r.pb, junta);
          defensores(K, [51.7, 12.4], [55.2, 12.2], { shAnim: 'kneel_one', haAnim: 'sit_floor', shFace: [53, 8], haFace: [53, 8] });
        },
        sobre(ctx, S) {
          placar(ctx, S, S.t >= CHUTE_REAL + 20 ? 3 : 2);
          torcida(ctx, S, 6, 0.5);
        },
        efeitos: [{ tipo: 'impacto', em: CHUTE_REAL, ate: CHUTE_REAL + 2 }],
        sons: [{ em: CHUTE_REAL, som: 'chute', arg: 0.9 }]
      },
      {
        // a bola na rede; os dois juntos no gramado e uma sombra só; a câmera sobe e o
        // estádio de Lisboa inteiro em pé
        id: 'um',
        dur: 230,
        expo: 1.06,
        cam: { de: [[53.9, 3.4, 13.8], [53.05, 0.28, 8.8], 44], para: [[54.6, 8.2, 18.6], [53.0, 0.2, 9.4], 52], curva: 'suave' },
        cena(K, S) {
          const pa = [52.86, 9.35];
          const pb = [53.3, 9.35];
          dupla(K, 'a', { x: pa[0], y: pa[1], face: pb, anim: 'celebrate', frame: 0, light: [1.12, 1.08, 1.02] });
          dupla(K, 'b', { x: pb[0], y: pb[1], face: pa, anim: 'celebrate', frame: 0, light: [1.12, 1.08, 1.02] });
          sombrasDosDois(K, pa, pb, 1);
          K.ball(GOL[0] - 0.3, GOL[1] - 0.25, 0.08);
          defensores(K, [51.7, 10.5], [54.6, 10.3], { shFace: pa, haFace: pb });
          goleiro(K, [53.8, 7.0], { anim: 'sit_floor' });
        },
        sobre(ctx, S) {
          placar(ctx, S, 3);
          torcida(ctx, S, 24, 0.9);
        },
        sons: [{ em: 2, som: 'gol', arg: true }]
      }
    ]
  });
  void clamp;
})();
