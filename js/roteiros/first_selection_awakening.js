// ============================================================================
// 13 · first_selection_awakening — "O campo em peças" (conceito A, CUTSCENE_STYLE §6: o
// quebra-cabeça é a assinatura reservada desta cena)
// Cap. 4, Time Z × Time V, no seu 1º gol da partida (firstGoalSakuga): interrompe o jogo,
// então é curta (~9 s, 3 planos).
//   P1 o drible: o Bachira passa pelo Reo; o gramado começa a mostrar as emendas de peça.
//   P2 o cruzamento em câmera lenta: o campo é um quebra-cabeça e falta uma peça na área,
//      a do lugar para onde você corre.
//   P3 o voleio: a peça cai e encaixa no contato (o pico: quadro de impacto); a bola passa
//      por cima do carrinho do Nagi e entra. As emendas somem: o campo fica inteiro.
// Sem o molde (sem P&B, sem cut-in de chuteira, sem DOM!!, sem câmera na rede, sem confete).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro || !CE.rtA) return;
  const R = CE.roteiro;
  const A = CE.rtA;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = R.seg;
  const lerp = R.lerp;
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

  // uniformes da partida (data_story: ch2_first_selection_v)
  const Z = { jerseyPrimary: '#1e40af', jerseySecondary: '#38bdf8' };
  const V = { jerseyPrimary: '#f8fafc', jerseySecondary: '#7e22ce' };

  // ---------------------------------------------------------------- a grade das peças
  // (o Time Z ataca o gol norte; a grade cobre a metade de ataque)
  const GX0 = 46.25;
  const GY0 = 6.7;
  const LADO = 1.5; // ladrilhos por peça
  const NC = 9;
  const NR = 7;
  const PX = 24; // px da textura por peça (16 px por ladrilho, como o chão do prédio)
  const M = PX / 2; // margem para os encaixes da borda
  const FURO = [5, 2]; // a peça que falta (coluna, linha)
  const FX = GX0 + (FURO[0] + 0.5) * LADO; // 54,5
  const FY = GY0 + (FURO[1] + 0.5) * LADO; // 10,45
  // Bayer 4x4: o desvanecer das emendas em pontilhado (pixel art, sem meio-tom)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const COSTURAS = () =>
    R.tela('fsa|costuras', NC * PX + 2 * M, NR * PX + 2 * M, (g, w, h) => {
      // sombra (1 px abaixo) e o corte claro por cima
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(4,40,20,1)';
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
        if (c === FURO[0] && r === FURO[1]) continue;
        g.beginPath();
        A.pecaPath(g, M + 0.5, M + 1.5, PX, c, r);
        g.stroke();
      }
      A.limiar(g, w, h, 90);
      const sombra = g.getImageData(0, 0, w, h);
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(236,253,245,1)';
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
        g.beginPath();
        A.pecaPath(g, M + 0.5, M + 0.5, PX, c, r);
        g.stroke();
      }
      A.limiar(g, w, h, 90);
      const claro = g.getImageData(0, 0, w, h);
      // junta: o claro manda; a sombra só onde não tem claro. As emendas somem em pontilhado
      // longe da peça que falta (o quebra-cabeça "nasce" dela)
      const out = g.createImageData(w, h);
      const cx = M + (FURO[0] + 0.5) * PX;
      const cy = M + (FURO[1] + 0.5) * PX;
      const rmax = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const d = Math.hypot(x - cx, y - cy) / rmax;
        const keep = 1 - Math.max(0, d - 0.35) / 0.65;
        if (keep * 16 <= BAYER[(y % 4) * 4 + (x % 4)]) continue;
        const src = claro.data[i + 3] ? claro : sombra.data[i + 3] ? sombra : null;
        if (!src) continue;
        out.data[i] = src.data[i];
        out.data[i + 1] = src.data[i + 1];
        out.data[i + 2] = src.data[i + 2];
        out.data[i + 3] = src === claro ? 235 : 150;
      }
      g.putImageData(out, 0, 0);
    });
  // o buraco (a peça que falta) e a peça que cai: a mesma forma
  const formaPeca = (g, sx) => {
    g.beginPath();
    A.pecaPath(g, M - FURO[0] * PX + sx, M - FURO[1] * PX + sx, PX, FURO[0], FURO[1]);
  };
  const BURACO = () =>
    R.tela('fsa|buraco', PX + 2 * M, PX + 2 * M, (g, w, h) => {
      formaPeca(g, 0.5);
      g.fillStyle = '#010203';
      g.fill();
      A.limiar(g, w, h, 110);
      // a parede de dentro do buraco: a borda de longe (oeste = a esquerda da textura, que a
      // câmera do lado leste vê de frente) é a terra do corte; o fundo some no preto
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#123d22';
      g.fillRect(0, 0, M + 4, h);
      g.fillRect(0, 0, w, M + 1);
      g.fillStyle = '#0a2414';
      g.fillRect(M + 4, M + 1, 2, h);
      g.fillRect(M + 4, M + 1, w, 1);
      g.restore();
      g.strokeStyle = 'rgba(236,253,245,1)';
      g.lineWidth = 1;
      formaPeca(g, 0.5);
      g.stroke();
      A.limiar(g, w, h, 90);
    });
  const PECA = () =>
    R.tela('fsa|peca', PX + 2 * M, PX + 2 * M, (g, w, h) => {
      formaPeca(g, 0.5);
      g.fillStyle = '#1d7f36';
      g.fill();
      A.limiar(g, w, h, 110);
      // as listras do gramado e o contorno no ciano (a sua cor)
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = '#22903d';
      for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 4);
      g.restore();
      g.strokeStyle = '#00f5d4';
      g.lineWidth = 1;
      formaPeca(g, 0.5);
      g.stroke();
      A.limiar(g, w, h, 90);
    });
  // placa deitada da grade inteira (x/y em ladrilhos)
  const chaoGrade = (K, img, alpha, z, em) => {
    if (alpha <= 0.01) return;
    const mt = M / (PX / LADO);
    K.floor({ x0: GX0 - mt, y0: GY0 - mt, x1: GX0 + NC * LADO + mt, y1: GY0 + NR * LADO + mt, z, img, alpha, em, color: '#ffffff' });
  };
  const chaoPeca = (K, img, alpha, z, em) => {
    if (alpha <= 0.01) return;
    const h = LADO / 2 + M / (PX / LADO);
    K.floor({ x0: FX - h, y0: FY - h, x1: FX + h, y1: FY + h, z, img, alpha, em, color: '#ffffff' });
  };

  // ---------------------------------------------------------------- o lance
  // (o lance fica a leste dos cones do treino que o mapa deixa no campo)
  const BACH0 = [49.9, 16.6];
  const REO = [52.15, 13.25];
  const CRUZA = [52.05, 12.45]; // de onde o Bachira cruza
  const DRIB = [51.35, 14.05]; // onde ele dá o elástico
  const VOLEIO = [FX + 0.15, FY + 0.25]; // você, de frente para o gol, em cima da peça
  const CONTATO = [FX - 0.05, FY - 0.08, 0.34];
  const GOL = [53.72, 6.66, 0.55]; // canto perto da câmera (o goleiro pula para o outro)
  const NAGI = [53.45, 9.15];
  const GK = [53.05, 7.05];
  // a bola do cruzamento (q 0..1): de baixo do pé do Bachira até o seu pé, por cima da área
  const cruz = (q) => {
    const a = [CRUZA[0] + 0.2, CRUZA[1] - 0.25, 0.05];
    const p = R.mix(a, CONTATO, q);
    p[2] += Math.sin(q * Math.PI) * 1.55;
    return p;
  };
  // a bola do voleio (q 0..1) até a rede
  const chute = (q) => {
    const p = R.mix(CONTATO, GOL, q);
    p[2] += Math.sin(q * Math.PI) * 0.18;
    return p;
  };

  // tempos (quadros)
  const P1_CRUZA = 128; // o pé do Bachira na bola (plano 1)
  const P3_HIT = 42; // o voleio (plano 3)
  const P3_REDE = P3_HIT + 20;

  R(
    'first_selection_awakening',
    {
      titulo: 'O DESPERTAR',
      musica: 'epic',
      tema: 'bluelock_bunker',
      grao: 0.05,
      vinheta: 0.45,
      cenario(K, t, st, pl, S) {
        K.sky('#0b1636', '#1e3a8a', 0.4);
        // o quebra-cabeça no gramado (alpha das emendas, do buraco e da peça por plano)
        const q = pl.puzzle ? pl.puzzle(t, S) : null;
        if (!q) return;
        chaoGrade(K, COSTURAS(), q.costura, 0.009, false);
        chaoPeca(K, BURACO(), q.buraco, 0.011, true);
        if (q.peca > 0) chaoPeca(K, PECA(), q.peca, 0.013 + (q.pecaZ || 0), false);
      },
      planos: [
        {
          id: 'drible',
          dur: 170,
          // de lado, uns 35°, acompanhando o Bachira (ele vem da esquerda para a direita)
          cam: { de: [[57.1, 3.1, 17.0], [50.3, 0.42, 14.9], 31], para: [[57.3, 3.1, 15.0], [51.5, 0.42, 13.0], 34], curva: 'easeIO' },
          puzzle: (t) => ({ costura: 0.55 * seg(t, 70, 165), buraco: 0, peca: 0 }),
          atores: [
            // o Bachira conduz, dá o elástico no Reo e cruza de pé direito
            {
              quem: 'bachira',
              extra: Z,
              x: (t) => (t < 52 ? lerp(BACH0[0], DRIB[0], ease(t / 52)) : t < 96 ? lerp(DRIB[0], CRUZA[0], ease(seg(t, 70, 96))) : CRUZA[0]),
              y: (t) => (t < 52 ? lerp(BACH0[1], DRIB[1], ease(t / 52)) : t < 96 ? lerp(DRIB[1], CRUZA[1], ease(seg(t, 70, 96))) : CRUZA[1]),
              anim: (t) => (t < 52 ? 'run' : t < 70 ? 'rabona' : t < 104 ? 'run' : t < P1_CRUZA - 10 ? 'windup' : 'shoot'),
              frame: (t) => (t < 52 || (t >= 70 && t < 104) ? 1 + (Math.floor(t / 3) % 4) * 4 : t >= P1_CRUZA - 10 ? 1 : undefined),
              olha: (t) => (t < 104 ? [52.6, 12.0] : [FX, FY])
            },
            // o Reo se joga para o lado errado
            {
              quem: 'reo',
              extra: V,
              x: (t) => REO[0] - ease(seg(t, 58, 80)) * 0.75,
              y: (t) => REO[1] + ease(seg(t, 58, 80)) * 0.35,
              z: (t) => Math.sin(seg(t, 58, 80) * Math.PI) * 0.12,
              anim: (t) => (t < 58 ? 'idle' : 'dive'),
              opts: (t) => (t >= 58 ? { animTime: Math.min(30, (t - 58) * 1.2) } : undefined),
              olha: (t) => (t < 58 ? [50.8, 15.6] : [49.8, 13.9])
            },
            { quem: 'you', extra: Z, de: [57.1, 13.3], para: [56.6, 12.85], anim: 'correr', olha: [FX, FY] },
            { quem: 'nagi', extra: V, x: NAGI[0], y: NAGI[1] + 0.3, olha: [CRUZA[0], CRUZA[1]] },
            { quem: 'gk_teamv', x: GK[0], y: GK[1], olha: [CRUZA[0], CRUZA[1]] },
            { quem: 'kunigami', extra: Z, de: [51.6, 10.3], para: [51.5, 9.6], anim: 'correr', olha: [52, 7] },
            { quem: 'zantetsu', extra: V, de: [52.3, 10.0], para: [52.2, 9.3], anim: 'correr', olha: [51.5, 9.6] }
          ],
          cena(K, S) {
            const t = S.t;
            let b;
            if (t < P1_CRUZA) {
              // a bola colada no pé (no elástico ela vai e volta)
              const bx = t < 52 ? lerp(BACH0[0], DRIB[0], ease(t / 52)) : t < 96 ? lerp(DRIB[0], CRUZA[0], ease(seg(t, 70, 96))) : CRUZA[0];
              const by = t < 52 ? lerp(BACH0[1], DRIB[1], ease(t / 52)) : t < 96 ? lerp(DRIB[1], CRUZA[1], ease(seg(t, 70, 96))) : CRUZA[1];
              const el = t >= 52 && t < 70 ? Math.sin(seg(t, 52, 70) * Math.PI * 2) * 0.22 : 0;
              b = [bx + 0.22 + el, by - 0.28, 0.05];
            } else b = cruz(seg(t, P1_CRUZA, P1_CRUZA + 150) * 0.85);
            K.ball(b[0], b[1], b[2]);
            A.sombraBola(K, b[0], b[1], b[2]);
            A.sombra(K, 57.0, 13.2, 0.25);
          },
          falas: [{ em: 104, quem: 'BACHIRA', texto: '"É você!!"', tipo: 'grito' }],
          sons: [{ em: P1_CRUZA, som: 'passe' }],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.7);
          }
        },
        {
          id: 'cruzamento',
          dur: 190,
          // câmera lenta: o cruzamento inteiro no ar enquanto você chega na peça que falta
          lento: { em: 0, ate: 190, fator: 0.22, rampa: 24 },
          // do alto (uns 45°), a área inteira: a peça que falta no meio do quadro
          cam: { de: [[58.9, 5.0, 13.4], [53.4, 0.0, 10.6], 50], para: [[58.4, 4.6, 12.6], [53.8, 0.1, 10.3], 46], curva: 'easeIO' },
          puzzle: (t) => ({ costura: lerp(0.55, 0.95, seg(t, 0, 40)), buraco: seg(t, 12, 46), peca: 0 }),
          atores: [
            { quem: 'you', extra: Z, de: [56.0, 12.35], para: [VOLEIO[0] + 0.45, VOLEIO[1] + 0.55], anim: 'correr', passo: 4, olha: [FX, FY], ate: 56 },
            { quem: 'bachira', extra: Z, x: CRUZA[0], y: CRUZA[1], anim: 'shoot', frame: 1, olha: [FX, FY] },
            { quem: 'reo', extra: V, x: REO[0] - 0.75, y: REO[1] + 0.35, anim: 'sit_floor', olha: [FX, FY] },
            { quem: 'nagi', extra: V, de: [NAGI[0], NAGI[1] + 0.3], para: [NAGI[0], NAGI[1]], anim: 'correr', olha: [FX, FY], ate: 56 },
            { quem: 'gk_teamv', x: GK[0], y: GK[1], olha: [FX, FY] },
            { quem: 'kunigami', extra: Z, x: 51.5, y: 9.6, olha: [FX, FY] },
            { quem: 'zantetsu', extra: V, x: 52.2, y: 9.3, olha: [FX, FY] }
          ],
          cena(K, S, st) {
            // (o tempo da ação: ~52 quadros de cruzamento em 190 reais)
            const qb = lerp(0.12, 0.86, seg(S.A, 0, 56));
            const b = cruz(qb);
            const b0 = cruz(Math.max(0, qb - 0.12));
            K.ball(b[0], b[1], b[2]);
            A.sombraBola(K, b[0], b[1], b[2]);
            st.bola = R.ponto(b[0], b[1], b[2]);
            st.bola0 = R.ponto(b0[0], b0[1], b0[2]);
            A.sombra(K, VOLEIO[0] + 0.3, VOLEIO[1] + 0.4, 0.25);
          },
          falas: [{ em: 36, quem: 'you', texto: '(A última peça... sou EU.)', tipo: 'pensamento' }],
          sons: [{ em: 4, som: 'vento' }],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            A.rastro(ctx, st.bola0, st.bola, '255,255,255', 0.55, 7);
          }
        },
        {
          id: 'voleio',
          dur: 190,
          cam: (K, t) => {
            // de lado e do alto; depois do voleio a câmera vira com a bola até o gol
            const k = ease(seg(t, P3_HIT + 4, P3_HIT + 44));
            const p = R.curvas.easeIO(seg(t, 0, P3_HIT));
            const eye = R.mix([58.2, 2.9, 12.0], [57.8, 2.7, 11.6], p);
            // (a câmera recua e sobe: você continua inteiro no canto e o gol vem para o meio)
            const eye2 = [59.0, 3.9, 10.9];
            const look = R.mix([54.4, 0.4, 10.2], [54.4, 0.4, 10.1], p);
            const look2 = [53.7, 0.4, 8.4];
            return [R.mix(eye, eye2, k), R.mix(look, look2, k), lerp(40, 48, k)];
          },
          puzzle: (t) => ({
            // a peça cai e encaixa no contato; as emendas acendem e somem (o campo inteiro)
            costura: t < P3_HIT ? 0.95 : 0.95 * (1 - seg(t, P3_HIT + 18, P3_HIT + 70)),
            buraco: t < P3_HIT ? 1 : 0,
            peca: t < P3_HIT - 16 ? 0 : 1 - seg(t, P3_HIT + 30, P3_HIT + 64),
            pecaZ: t < P3_HIT ? (1 - ease(seg(t, P3_HIT - 16, P3_HIT))) * 0.36 : 0
          }),
          atores: [
            {
              quem: 'you',
              extra: Z,
              de: [VOLEIO[0] + 0.45, VOLEIO[1] + 0.55],
              para: [VOLEIO[0], VOLEIO[1]],
              ate: P3_HIT - 12,
              anim: (t) => (t < P3_HIT - 14 ? 'run' : t < P3_HIT ? 'windup' : t < 130 ? 'shoot' : 'celebrate'),
              frame: (t) => (t < P3_HIT - 14 ? 1 + (Math.floor(t / 4) % 4) * 4 : t < 130 ? 1 : undefined),
              olha: [GOL[0], GOL[1]]
            },
            // o carrinho do Nagi: a bola passa por cima da ponta da chuteira
            {
              quem: 'nagi',
              extra: V,
              x: (t) => lerp(NAGI[0], 54.05, ease(seg(t, P3_HIT - 6, P3_HIT + 14))),
              y: (t) => lerp(NAGI[1], 9.35, ease(seg(t, P3_HIT - 6, P3_HIT + 14))),
              anim: (t) => (t < P3_HIT - 6 ? 'run' : 'slide'),
              frame: (t) => (t < P3_HIT - 6 ? 1 + (Math.floor(t / 4) % 4) * 4 : undefined),
              opts: (t) => (t >= P3_HIT - 6 ? { animTime: Math.min(40, (t - P3_HIT + 6) * 1.5) } : undefined),
              olha: [VOLEIO[0], VOLEIO[1]]
            },
            // o goleiro pula para o canto errado (o longe da câmera)
            {
              quem: 'gk_teamv',
              x: (t) => lerp(GK[0], 52.25, ease(seg(t, P3_HIT + 4, P3_HIT + 24))),
              y: GK[1],
              z: (t) => Math.sin(seg(t, P3_HIT + 4, P3_HIT + 28) * Math.PI) * 0.3,
              anim: (t) => (t < P3_HIT + 4 ? 'idle' : 'dive'),
              opts: (t) => (t >= P3_HIT + 4 ? { animTime: Math.min(30, (t - P3_HIT - 4) * 1.4) } : undefined),
              olha: (t) => (t < P3_HIT + 4 ? [VOLEIO[0], VOLEIO[1]] : [49, 7.05])
            },
            { quem: 'bachira', extra: Z, de: [CRUZA[0], CRUZA[1]], para: [52.6, 11.4], em: 70, ate: 190, anim: (t) => (t < 70 ? 'idle' : 'correr'), olha: [VOLEIO[0], VOLEIO[1]] },
            { quem: 'kunigami', extra: Z, x: 51.5, y: 9.6, anim: (t) => (t > P3_REDE + 6 ? 'celebrate' : 'idle'), olha: [GOL[0], GOL[1]] },
            { quem: 'zantetsu', extra: V, x: 52.2, y: 9.3, olha: [GOL[0], GOL[1]] }
          ],
          cena(K, S, st) {
            const t = S.t;
            let b;
            if (t < P3_HIT) b = cruz(lerp(0.86, 1, R.curvas.entra(seg(t, 0, P3_HIT))));
            else if (t < P3_REDE) b = chute(seg(t, P3_HIT, P3_REDE));
            else {
              // na rede: estufa e cai
              const u = t - P3_REDE;
              b = [GOL[0] - 0.05, Math.max(6.2, GOL[1] - u * 0.05), Math.max(0.08, GOL[2] - u * 0.012)];
            }
            K.ball(b[0], b[1], b[2]);
            st.pe = R.ponto(CONTATO[0], CONTATO[1], CONTATO[2]);
            if (t >= P3_HIT && t < P3_REDE + 4) {
              const b0 = chute(Math.max(0, seg(t, P3_HIT, P3_REDE) - 0.35));
              st.bola = R.ponto(b[0], b[1], b[2]);
              st.bola0 = R.ponto(b0[0], b0[1], b0[2]);
            }
            A.sombra(K, VOLEIO[0], VOLEIO[1], 0.25);
          },
          efeitos: [
            { tipo: 'impacto', em: P3_HIT, ate: P3_HIT + 2 },
            { tipo: 'tremor', em: P3_HIT, ate: P3_HIT + 26, forca: 0.5, amp: 0.05 },
            { tipo: 'linhas', modo: 'radial', em: P3_HIT, ate: P3_HIT + 9, alvo: 'pe', forca: 0.35, cor: '#ecfeff' }
          ],
          falas: [{ em: 96, quem: 'EGO', texto: '"Isso! Esse é o EGO."' }],
          sons: [
            { em: P3_HIT - 2, som: 'bip', arg: 1320 },
            { em: P3_HIT, som: 'chute', arg: 1 },
            { em: P3_REDE, som: 'gol', arg: true }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.8);
            A.rastro(ctx, st.bola0, st.bola, '0,245,212', 0.8 * (1 - seg(S.t, P3_REDE, P3_REDE + 4)), 10);
          }
        }
      ]
    }
  );
})();
