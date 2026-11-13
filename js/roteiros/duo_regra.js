// ============================================================================
// 61 · duo_regra — "A cadeira vazia no meio" (CUTSCENE_STYLE §6, conceito B do lote 1)
// Modo Dupla ("Projeto Elo", lore original do jogo), Arco 3, cap. "A Regra do Um":
// narrador → Ego "Agora esqueçam." → ESTA cena → o Ego explica a vaga → a escolha.
// Um auditório de verdade, montado na área vazia (K.VOID): palco, telão e poltronas em
// degraus. Assinatura: a cadeira vazia que aparece de repente entre cada dupla, no
// auditório inteiro, no mesmo corte seco (o mesmo enquadramento de antes). Pico: a tremida
// forte nesse corte. A cena acaba antes da escolha.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, rnd, tela, brilho, placa } = R;

  // ---------------------------------------------------------------- o auditório
  // palco e telão ao norte (y 9–11,6); três fileiras em degraus; corredores nos lados
  const AUD = { x0: 79, x1: 93, y0: 9, y1: 22.5, h: 4.6 };
  const FILAS = [{ y: 14.6, z: 0 }, { y: 16.2, z: 0.28 }, { y: 17.8, z: 0.56 }];
  const DUPLAS_X = [81.5, 84.5, 87.5, 90.5];
  const NOSSA = { fila: 0, i: 2 }; // vocês dois: 1ª fileira, a 3ª dupla
  const TELAO = { x: 86, y: 9.06, z: 0.95, w: 8.2, h: 3.3 };
  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const VERMELHO = [1.15, 0.72, 0.72];

  // as poltronas de cada dupla: juntas (2) ou separadas, com a vazia no meio (3)
  const lugares = (cx, separado) => (separado ? [cx - 0.64, cx, cx + 0.64] : [cx - 0.31, cx + 0.31]);
  function poltrona(K, x, f, vazia, luz) {
    const y = f.y;
    const z = f.z;
    const cor = vazia ? '#d9d4cf' : '#7f1d1d';
    const topo = vazia ? '#f1ece6' : '#991b1b';
    const L = vazia ? [1.05, 1.0, 1.0] : luz;
    K.box({ x0: x - 0.26, y0: y - 0.18, x1: x + 0.26, y1: y + 0.16, z0: z, z1: z + 0.17, color: cor, top: topo, light: L });
    K.box({ x0: x - 0.26, y0: y + 0.14, x1: x + 0.26, y1: y + 0.24, z0: z, z1: z + 0.5, color: cor, top: topo, light: L });
    [-0.28, 0.28].forEach((dx) => K.box({ x0: x + dx - 0.03, y0: y - 0.16, x1: x + dx + 0.03, y1: y + 0.2, z0: z, z1: z + 0.27, color: '#1f0a0a', light: luz }));
  }

  // o telão: o rosto do Ego em pixel, com a luz vermelha; a boca mexe quando ele fala
  let TV = null;
  let TV_KEY = '';
  function telaoCv(S, fala) {
    if (!TV) {
      TV = document.createElement('canvas');
      TV.width = 160;
      TV.height = 64;
    }
    const boca = fala ? Math.floor(S.t / 5) % 3 : 0;
    const key = `${CE._cineRun}|${S.phase}|${boca}|${Math.floor(S.t / 30) % 2}`;
    if (key === TV_KEY) return { cv: TV, dirty: false };
    TV_KEY = key;
    const g = TV.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#240408';
    g.fillRect(0, 0, 160, 64);
    const P = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    // o busto do Ego, grande no telão (cabelo em cuia, óculos, gola alta), tingido de vermelho
    P(52, 46, 56, 12, '#2a0606');
    P(70, 40, 20, 7, '#3b0a0a');
    P(66, 13, 28, 29, '#a8615a');
    P(70, 38, 20, 4, '#8a4a44');
    P(62, 4, 36, 12, '#140303');
    P(60, 10, 6, 22, '#140303');
    P(94, 10, 6, 22, '#140303');
    P(66, 16, 28, 2, '#140303');
    P(68, 21, 10, 6, '#3a0808');
    P(82, 21, 10, 6, '#3a0808');
    P(69, 22, 8, 2, '#f87171');
    P(83, 22, 8, 2, '#f87171');
    P(78, 23, 4, 1, '#3a0808');
    P(76, 34 - boca, 8, 1 + boca, '#3a0808');
    for (let y = 0; y < 52; y += 2) P(0, y, 160, 1, 'rgba(0,0,0,0.18)');
    // a faixa do Projeto Elo embaixo
    P(0, 52, 160, 12, '#0b0204');
    P(0, 52, 160, 1, '#ca8a04');
    CE.finPixelText(g, 'PROJETO ELO • 12 DUPLAS', 80, 58, 1, '#fde047', 'center', 140);
    if (Math.floor(S.t / 30) % 2) P(150, 4, 5, 5, '#ef4444');
    return { cv: TV, dirty: true };
  }

  function auditorio(K, S, st, o) {
    const { x0, x1, y0, y1, h } = AUD;
    K.sky('#08030a', '#08030a', 0);
    K.fog('#14060a', 0.02);
    K.ambient('#e0a8a8');
    // chão, teto, paredes laterais e do fundo
    K.floor({ x0, y0, x1, y1, color: '#2a1418', light: [0.9, 0.7, 0.72] });
    K.floor({ x0, y0, x1, y1, z: h, color: '#0c0507' });
    placa(K, { x: x0 + 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: paredeCv(), color: '#ffffff', light: [0.8, 0.6, 0.62] });
    placa(K, { x: x1 - 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: paredeCv(), color: '#ffffff', light: [0.8, 0.6, 0.62] });
    placa(K, { x: (x0 + x1) / 2, y: y1 - 0.01, w: x1 - x0, h, ang: -Math.PI / 2, img: paredeCv(), color: '#ffffff', light: [0.7, 0.55, 0.58] });
    placa(K, { x: (x0 + x1) / 2, y: y0 + 0.01, w: x1 - x0, h, ang: Math.PI / 2, color: '#120508', light: [0.8, 0.6, 0.62] });
    // o palco, a borda dourada e o telão (a luz vermelha dele no palco e na plateia)
    K.box({ x0: x0 + 0.8, y0: y0, x1: x1 - 0.8, y1: 11.6, z0: 0, z1: 0.3, color: '#1a0a0e', top: '#2a1218', light: [0.9, 0.7, 0.72] });
    K.floor({ x0: x0 + 0.8, y0: 11.56, x1: x1 - 0.8, y1: 11.6, z: 0.304, color: '#ca8a04', em: true });
    K.box({ x0: TELAO.x - TELAO.w / 2 - 0.14, y0: y0 + 0.01, x1: TELAO.x + TELAO.w / 2 + 0.14, y1: y0 + 0.05, z0: TELAO.z - 0.14, z1: TELAO.z + TELAO.h + 0.14, color: '#050203' });
    const tv = telaoCv(S, !!o.fala);
    placa(K, { x: TELAO.x, y: TELAO.y, z: TELAO.z, w: TELAO.w, h: TELAO.h, ang: Math.PI / 2, img: tv.cv, dirty: tv.dirty, color: '#ffffff', em: true, alpha: 0.999 });
    K.floor({ x0: 80.5, y0: 11.6, x1: 91.5, y1: 20.5, z: 0.006, img: brilho('rgba(239,68,68,0.5)', 0.5, 0.0), color: '#ffffff', em: true, alpha: 0.999 });
    // os degraus da plateia
    FILAS.forEach((f, i) => {
      if (f.z > 0) K.box({ x0: x0 + 0.8, y0: f.y - 0.62, x1: x1 - 0.8, y1: f.y + 0.78, z0: 0, z1: f.z, color: '#24100f', top: '#311416', light: [0.85, 0.66, 0.68] });
      void i;
    });
    // as luzinhas do corredor (no chão, nos dois lados) e as arandelas nas paredes
    [x0 + 0.5, x1 - 0.5].forEach((x) => {
      for (let y = 13; y < 21; y += 0.8) K.box({ x0: x - 0.04, y0: y - 0.04, x1: x + 0.04, y1: y + 0.04, z0: 0, z1: 0.04, color: '#fbbf24', em: true });
    });
    [x0 + 0.03, x1 - 0.03].forEach((x) => {
      for (let y = 12.4; y < 22; y += 2.4) {
        K.sprite(brilho('rgba(251,191,36,0.75)'), { x, y, z: 1.55, w: 0.9, h: 0.9, glow: true, alpha: 0.8 });
        K.box({ x0: x - 0.04, y0: y - 0.08, x1: x + 0.04, y1: y + 0.08, z0: 1.45, z1: 1.62, color: '#fde68a', em: true });
      }
    });
    // as poltronas das doze duplas (juntas antes do corte; com a vazia no meio depois)
    FILAS.forEach((f, fi) => {
      DUPLAS_X.forEach((cx) => {
        const L = lugares(cx, o.separado);
        L.forEach((x, k) => poltrona(K, x, f, o.separado && k === 1, [0.95, 0.66, 0.68]));
        // a luz fria de cima em cada cadeira vazia (a assinatura: aparece no corte)
        if (o.separado) K.floor({ x0: cx - 0.38, y0: f.y - 0.36, x1: cx + 0.38, y1: f.y + 0.36, z: f.z + 0.004, img: brilho('rgba(241,245,249,0.55)'), color: '#ffffff', em: true, alpha: 0.999 });
      });
    });
    st.nossa = R.ponto(DUPLAS_X[NOSSA.i], FILAS[NOSSA.fila].y, FILAS[NOSSA.fila].z + 0.35);
  }
  const paredeCv = () =>
    tela('c61|parede', 64, 32, (g, w, h) => {
      g.fillStyle = '#3e1820';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#4c1f29';
      for (let x = 0; x < w; x += 8) g.fillRect(x + 1, 0, 6, h);
      g.fillStyle = '#ca8a04';
      g.fillRect(0, h - 9, w, 1);
    });

  // ---------------------------------------------------------------- as duplas
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
    const A = window.App || {};
    const cabelos = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const peles = A.CREATOR_SKIN || ['#f3d1b8'];
    const cores = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 61;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    const fig = (i) => {
      const hc = cores[r(cores.length)];
      return Object.assign({ name: 'elo61_' + i, skinColor: peles[r(peles.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: cabelos[r(cabelos.length)], number: 1 + r(60) }, ELO);
    };
    const prof = (A.state && A.state.profile) || {};
    const a = (c && c.a) || Object.assign({ skinColor: '#f3d1b8', hairStyle: 'spiky_tall' }, prof, ELO, { name: 'duo_a' });
    const b = (c && c.b) || Object.assign({ name: 'duo_b', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5' }, ELO);
    ELENCO = { run, a, b, outros: Array.from({ length: 22 }, (_, i) => fig(i)) };
    return ELENCO;
  }
  // os 24 sentados; separado = cada um na sua ponta, a cadeira do meio vazia
  function duplas(K, S, st, separado, luz) {
    const E = elenco();
    let n = 0;
    FILAS.forEach((f, fi) => {
      DUPLAS_X.forEach((cx, di) => {
        const L = lugares(cx, separado);
        const pos = [L[0], L[L.length - 1]];
        const nossa = fi === NOSSA.fila && di === NOSSA.i;
        pos.forEach((x, k) => {
          const cd = nossa ? (k ? E.b : E.a) : E.outros[n++ % E.outros.length];
          K.actor(cd, { id: (nossa ? 'n' : 'd') + fi + di + k, x, y: f.y - 0.02, z: f.z, face: [86 + (x - 86) * 0.2, 9], anim: 'sit', seat: 0.17, frame: 0, k: 0.86, light: nossa ? [luz[0] * 1.08, luz[1] * 1.08, luz[2] * 1.08] : luz });
        });
      });
    });
    void st;
  }

  // ---------------------------------------------------------------- o roteiro
  // (o fundo do auditório, alto: o mesmo enquadramento antes e depois do corte)
  const FUNDO = [[86.4, 3.35, 22.2], [86.0, 0.9, 12.6], 52];

  R('duo_regra', {
    titulo: 'A REGRA DO UM',
    musica: 'dread',
    grao: 0.05,
    vinheta: 0.55,
    cenario(K, t, st, pl, S) {
      auditorio(K, S, st, { separado: !!pl.separado, fala: !!pl.egoFala });
    },
    planos: [
      {
        // do fundo, alto: as doze duplas coladas, ombro com ombro; o Ego no telão
        id: 'duplas',
        dur: 210,
        expo: 1.18,
        cam: { de: [[86.2, 3.1, 21.6], [86.0, 1.0, 12.4], 54], para: FUNDO, curva: 'suave' },
        cena(K, S, st) {
          duplas(K, S, st, false, [0.95, 0.72, 0.74]);
        },
        letreiros: [{ em: 10, texto: 'AUDITÓRIO DO PROJETO ELO • RESTAM 12 DUPLAS', cor: '#fde047' }]
      },
      {
        // do palco, alto: as vinte e quatro caras na luz vermelha do telão, ouvindo
        id: 'um',
        dur: 220,
        expo: 1.15,
        egoFala: true,
        cam: { de: [[86.0, 2.55, 10.8], [86.0, 0.5, 16.1], 54], para: [[86.0, 2.4, 11.3], [86.0, 0.48, 16.0], 50], curva: 'suave' },
        cena(K, S, st) {
          duplas(K, S, st, false, VERMELHO);
        },
        falas: [{ em: 12, quem: 'JINPACHI EGO', texto: '"A Sub-20 vai levar UM atacante do Projeto Elo. Um."' }]
      },
      {
        // corte seco, o mesmo enquadramento do fundo: agora, entre cada dupla, uma cadeira
        // vazia. A sala treme; depois a câmera começa a descer até vocês dois
        id: 'vazia',
        dur: 200,
        expo: 1.18,
        separado: true,
        // (só um empurrão leve do mesmo lugar: descer ou dar zoom por cima das fileiras punha
        // cabeças enormes na frente de vocês; quem desce até vocês é o plano seguinte, pela frente)
        cam: { de: FUNDO, para: [[86.5, 3.15, 21.5], [86.7, 0.8, 13.2], 46], curva: 'suave', em: 60, ate: 200 },
        cena(K, S, st) {
          duplas(K, S, st, true, [0.95, 0.72, 0.74]);
        },
        efeitos: [{ tipo: 'tremor', em: 0, ate: 34, forca: 0.85, amp: 0.08 }],
        sons: [{ em: 0, som: 'carrinho' }]
      },
      {
        // a câmera desce do alto do palco até vocês dois, na 1ª fileira: a cadeira vazia entre
        // os dois, cada um olhando para a frente
        id: 'voces',
        dur: 220,
        expo: 1.2,
        separado: true,
        cam: { de: [[87.5, 2.5, 11.7], [87.5, 0.55, 14.7], 50], para: [[87.42, 0.86, 12.7], [87.5, 0.5, 14.7], 43], curva: 'easeIO', ate: 150 },
        cena(K, S, st) {
          duplas(K, S, st, true, VERMELHO);
        },
        falas: [{ em: 50, quem: 'NARRADOR', texto: 'Agora cada um tem o seu número.' }]
      }
    ]
  });
  void seg;
  void lerp;
  void rnd;
})();
