// ============================================================================
// 19/20 · world_five_fall / world_five_win — "Dois tempos" (conceito A)
// Cap. 6, Blue Lock × World Five (Loki, Luna, Blake, Dada Silva e Pablo Cavazos), na câmara
// holográfica, logo depois do jogo. O Blue Lock ataca o gol norte; o World Five, o sul.
// Assinatura: dois tempos no mesmo quadro. Quem é "do mundo" anda na velocidade normal
// enquanto o Blue Lock inteiro se mexe em câmera lentíssima (e um rastro dourado fica atrás
// do Loki). Na vitória o truque vira ao contrário: no seu gol é você quem anda normal e o
// World Five fica lento.
//   Derrota (19, ~21 s): o Rin abre em tempo normal → a velocidade divina do Loki passando
//     por todos (o pico: tremida forte quando ele passa o último) → os gols do mundo em cortes
//     secos de 2 s → o mundo vai embora andando; o Blue Lock parado. Placar do jogo: 1 × 5.
//   Vitória (20, ~23 s): planos próprios (a câmera do outro lado). O Loki do alto → o Blue Lock
//     aguenta (agora no mesmo tempo que eles) → o SEU gol com o tempo invertido (o pico) → o
//     Loki: "Vocês me fizeram suar." → os cinco de pé. Placar lido da partida.
// Sem a mão do Loki, sem a cartela "TOP 6" e sem a conta do Top 6.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro || !CE.rtA) return;
  const R = CE.roteiro;
  const A = CE.rtA;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = R.seg;
  const lerp = R.lerp;
  const suave = R.curvas.suave;
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

  const CORES = { LOKI: '#fbbf24' }; // (cor nova: não está na tabela do CUTSCENE_STYLE §1.2)
  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const WF = { jerseyPrimary: '#ffffff', jerseySecondary: '#eab308' }; // (data_story: ch3)
  const GN = A.campo.gn;
  const GS = A.campo.gs;
  const LENTO = 0.1; // o tempo do Blue Lock enquanto o mundo corre
  const passo = (t, p = 3) => 1 + (Math.floor(t / p) % 4) * 4;
  const trilha = (kf, t) => {
    if (t <= kf[0][0]) return [kf[0][1], kf[0][2]];
    for (let i = 1; i < kf.length; i++) {
      const a = kf[i - 1];
      const b = kf[i];
      if (t <= b[0]) {
        const k = suave(seg(t, a[0], b[0]));
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      }
    }
    const z = kf[kf.length - 1];
    return [z[1], z[2]];
  };
  const camara = (K) => {
    K.sky('#01030a', '#0b1a3a', 0.5);
    K.fog('#060d1f', 0.02);
  };
  const placar = (ctx, S, gc, gf, muda, mk, k = 1, min) =>
    A.placar(ctx, S, { casa: 'BLUE LOCK', fora: 'WORLD 5', gc, gf, corC: '#38bdf8', corF: '#eab308', muda, mk, k, min, direita: true });
  // a bola do chute: de b0 até o alvo (q 0..1), depois cai na rede
  const voo = (b0, alvo, t, t0, t1, curva = 0.14) => {
    const q = seg(t, t0, t1);
    if (q < 1) {
      const p = R.mix(b0, alvo, q);
      p[2] += Math.sin(q * Math.PI) * curva;
      return p;
    }
    const u = t - t1;
    const sg = alvo[1] > 14.5 ? 1 : -1;
    return [alvo[0], alvo[1] + sg * Math.min(0.4, u * 0.04), Math.max(0.08, alvo[2] - u * 0.02)];
  };
  // ator que corre por uma trilha (kf) com a bola, arma e chuta
  const corredor = (quem, extra, kf, arma, chute, alvo, o = {}) => ({
    quem,
    extra,
    id: o.id,
    x: (t) => trilha(kf, t)[0],
    y: (t) => trilha(kf, t)[1],
    anim: (t) => (t < arma ? 'run' : t < chute ? (o.bicicleta ? 'bicycle' : 'windup') : t < chute + 30 ? (o.bicicleta ? 'bicycle' : 'shoot') : 'idle'),
    frame: (t) => (t < arma ? passo(t, 3) : o.bicicleta ? undefined : 1),
    opts: o.bicicleta ? (t) => (t >= arma ? { animTime: Math.min(40, (t - arma) * 1.2) } : undefined) : o.opts,
    z: o.bicicleta ? (t) => Math.sin(seg(t, arma, chute + 20) * Math.PI) * 0.32 : undefined,
    olha: (t) => (t >= arma ? [alvo[0], alvo[1]] : [trilha(kf, t + 4)[0] * 2 - trilha(kf, t)[0], trilha(kf, t + 4)[1] * 2 - trilha(kf, t)[1]]),
    luz: o.luz,
    tempo: o.tempo,
    visivel: o.visivel
  });
  // a bola no pé de quem corre (kf) e depois o voo até o alvo
  const bolaCorrida = (K, st, kf, chute, gol, alvo, t, o = {}) => {
    let b;
    const p = trilha(kf, Math.min(t, chute));
    const p2 = trilha(kf, Math.min(t, chute) + 3);
    const d = Math.hypot(p2[0] - p[0], p2[1] - p[1]) || 1;
    const dx = (p2[0] - p[0]) / d;
    const dy = (p2[1] - p[1]) / d;
    const b0 = o.alto ? [p[0], p[1], o.alto] : [p[0] + dx * 0.28, p[1] + dy * 0.28, 0.06];
    if (t < chute) b = o.alto ? [p[0] + (o.vem ? o.vem[0] * (1 - seg(t, 0, chute)) : 0), p[1] + (o.vem ? o.vem[1] * (1 - seg(t, 0, chute)) : 0), o.alto + (1 - seg(t, 0, chute)) * 0.6] : [b0[0], b0[1], 0.05 + Math.abs(Math.sin(t * 0.33)) * 0.05];
    else {
      b = voo(b0, alvo, t, chute, gol, o.curva);
      const ba = voo(b0, alvo, Math.max(chute, t - 5), chute, gol, o.curva);
      if (t < gol + 4) {
        st.bola = R.ponto(b[0], b[1], b[2]);
        st.bola0 = R.ponto(ba[0], ba[1], ba[2]);
      }
      st.pe = R.ponto(b0[0], b0[1], 0.12);
    }
    K.ball(b[0], b[1], b[2]);
    A.sombraBola(K, b[0], b[1], b[2]);
    return b;
  };
  // o rastro dourado de quem corre "no outro tempo": 3 fantasmas atrás (silhuetas)
  const fantasmas = (quem, extra, kf, de, ate, cor, o = {}) =>
    [[5, 0.5], [10, 0.32], [15, 0.18]].map(([atraso, al]) => ({
      quem,
      extra,
      id: 'f' + atraso,
      x: (t) => trilha(kf, Math.max(0, t - atraso))[0],
      y: (t) => trilha(kf, Math.max(0, t - atraso))[1],
      anim: 'run',
      frame: (t) => passo(t - atraso, 3),
      olha: o.olha,
      tempo: o.tempo,
      visivel: [de, ate],
      silhueta: { cor, alpha: al }
    }));

  // ======================================================================== DERROTA
  // ---- o gol do Rin (tempo normal: os dois times no mesmo tempo)
  const RIN_KF = [[0, 53.45, 11.7], [112, 53.1, 9.25]];
  const RIN_CH = 120;
  const RIN_GOL = 136;
  const RIN_ALVO = [52.45, GN - 0.02, 0.7];
  // ---- a velocidade divina
  const LK_KF = [[0, 53.0, 11.8], [40, 53.0, 12.0], [108, 53.35, 19.65]];
  const LK_ARMA = 108;
  const LK_CH = 114;
  const LK_GOL = 128;
  const LK_ALVO = [53.72, GS + 0.02, 0.5];
  const LK_ULTIMO = 92; // passa o último (o Bachira): a tremida forte
  // o Blue Lock no caminho dele (posições e para onde viram, devagar)
  const DEF = [
    ['you', [52.55, 14.15]],
    ['aryu', [53.85, 15.4]],
    ['tokimitsu', [52.6, 16.75]],
    ['bachira', [53.75, 17.95]]
  ];
  const lento = (t) => t * LENTO;

  R('world_five_fall', {
    titulo: 'O TAMANHO DO MUNDO',
    musica: 'dread',
    tema: 'bluelock_holo',
    grao: 0.05,
    vinheta: 0.5,
    cores: CORES,
    planos: [
      {
        id: 'rin',
        dur: 250,
        // de lado, na altura do peito, correndo com o Rin (ele vai da direita para a esquerda)
        cam: { de: [[49.7, 0.62, 12.2], [53.2, 0.5, 11.3], 44], para: [[49.7, 0.62, 9.6], [52.9, 0.5, 8.5], 44], curva: 'easeIO' },
        cena(K, S, st) {
          camara(K);
          bolaCorrida(K, st, RIN_KF, RIN_CH, RIN_GOL, RIN_ALVO, S.t);
          A.sombra(K, trilha(RIN_KF, S.t)[0], trilha(RIN_KF, S.t)[1], 0.25);
        },
        atores: [
          corredor('rin', Object.assign({ angry: true }, BL), RIN_KF, RIN_CH - 8, RIN_CH, RIN_ALVO, { luz: [1.0, 1.08, 1.12] }),
          { quem: 'luna', extra: WF, de: [52.4, 9.2], para: [52.75, 8.5], anim: 'correr', olha: (t) => trilha(RIN_KF, t) },
          { quem: 'blake', extra: WF, de: [54.3, 11.9], para: [53.9, 9.8], anim: 'correr', olha: (t) => trilha(RIN_KF, t) },
          { quem: 'loki', extra: WF, x: 53.9, y: 13.4, olha: (t) => trilha(RIN_KF, t) },
          { quem: 'bachira', extra: BL, de: [54.6, 12.8], para: [54.3, 11.2], anim: 'correr', olha: [53, 8] }
        ],
        letreiros: [{ em: 8, ate: 200, sai: 20, texto: '2ª SELEÇÃO • BLUE LOCK × WORLD FIVE', cor: '#38bdf8' }],
        sons: [
          { em: RIN_CH, som: 'chute', arg: 1 },
          { em: RIN_GOL, som: 'gol', arg: true }
        ],
        sobre(ctx, S, K, st) {
          A.rastro(ctx, st.bola0, st.bola, '45,212,191', 0.7, 9);
          placar(ctx, S, S.t >= RIN_GOL ? 1 : 0, 0, 'casa', seg(S.t, RIN_GOL, RIN_GOL + 40), seg(S.t, 6, 26));
        }
      },
      {
        id: 'loki',
        dur: 330,
        // correndo com o Loki, na altura do peito: ele no tempo normal, o Blue Lock quase parado
        cam: (K, t) => {
          const ly = trilha(LK_KF, Math.max(0, Math.min(t, LK_ARMA + 20) - 5))[1];
          const k = ease(seg(t, LK_CH, LK_GOL + 30));
          const eye = [49.4, 0.62, lerp(ly - 0.3, 19.8, k)];
          const look = [53.2, 0.5, lerp(ly + 0.7, 20.9, k)];
          return [eye, look, 44];
        },
        cena(K, S, st) {
          camara(K);
          const t = S.t;
          bolaCorrida(K, st, LK_KF, LK_CH, LK_GOL, LK_ALVO, t);
          const p = trilha(LK_KF, t);
          A.sombra(K, p[0], p[1], 0.25);
          DEF.forEach(([, d]) => A.sombra(K, d[0], d[1], 0.2));
        },
        atores: [
          corredor('loki', WF, LK_KF, LK_ARMA, LK_CH, LK_ALVO, { luz: [1.12, 1.08, 0.98] }),
          ...fantasmas('loki', WF, LK_KF, 40, LK_ARMA, '#fbbf24', { olha: [53.4, 25] }),
          // o Blue Lock em câmera lentíssima: viram e começam a correr atrás dele, devagar
          ...DEF.map(([q, p], i) => ({
            quem: q,
            extra: BL,
            x: p[0],
            y: p[1],
            tempo: lento,
            anim: (t) => (t > 4 + i * 1.2 ? 'run' : 'idle'),
            frame: (t) => passo(t, 3),
            olha: (t) => (t < 4 + i * 1.2 ? [53, 11] : [53.3, 23]),
            luz: [0.85, 0.9, 1.0]
          })),
          { quem: 'rin', extra: Object.assign({ angry: true }, BL), x: 55.6, y: 12.4, tempo: lento, anim: 'run', frame: (t) => passo(t, 3), olha: [53.3, 23], luz: [0.85, 0.9, 1.0] }
        ],
        efeitos: [
          { tipo: 'linhas', modo: 'paralelas', em: 40, ate: LK_ARMA, ang: 0, forca: 0.32, decai: false, entra: 6, sai: 8, cor: 'rgba(254,243,199,0.55)' },
          // o pico: a tremida forte quando ele passa o último
          { tipo: 'tremor', em: LK_ULTIMO, ate: LK_ULTIMO + 40, forca: 0.85, amp: 0.06 }
        ],
        falas: [{ em: 160, quem: 'JULIAN LOKI', texto: '"Desculpe. Nessa velocidade, ninguém me alcança."' }],
        sons: [
          { em: 40, som: 'vento' },
          { em: LK_CH, som: 'chute', arg: 1 },
          { em: LK_GOL, som: 'gol', arg: false }
        ],
        sobre(ctx, S, K, st) {
          A.rastro(ctx, st.bola0, st.bola, '251,191,36', 0.7, 9);
          placar(ctx, S, 1, S.t >= LK_GOL ? 1 : 0, 'fora', seg(S.t, LK_GOL, LK_GOL + 40));
        }
      },
      mundo('mundo1', [
        // Luna: corta o Aryu (lento) e bate de curva
        { kf: [[0, 51.7, 16.6], [62, 52.35, 19.5]], quem: 'luna', arma: 62, chute: 70, gol: 86, alvo: [52.45, GS + 0.02, 0.7], def: ['aryu', [52.35, 18.0]], cam: [[49.6, 0.9, 17.4], [52.9, 0.5, 19.2], 44], placar: [1, 2] },
        // Blake: bomba de longe; o Tokimitsu se joga devagar
        { kf: [[0, 54.4, 15.6], [50, 54.2, 17.0]], quem: 'blake', arma: 50, chute: 58, gol: 76, alvo: [53.6, GS + 0.02, 0.45], def: ['tokimitsu', [53.8, 18.6]], cam: [[50.1, 1.7, 15.6], [53.8, 0.35, 18.6], 46], placar: [1, 3] }
      ]),
      mundo('mundo2', [
        // Dada Silva: bicicleta na área; o Rin sobe devagar
        { kf: [[0, 53.0, 19.5], [44, 53.1, 20.1]], quem: 'dada_silva', arma: 44, chute: 64, gol: 76, alvo: [53.5, GS + 0.02, 0.85], def: ['rin', [53.75, 20.85]], bicicleta: true, alto: 0.7, vem: [-1.6, -1.2], cam: [[50.3, 1.25, 18.7], [53.2, 0.6, 20.4], 42], placar: [1, 4] },
        // Pablo: arranca pela direita e bate cruzado; você chega atrasado
        { kf: [[0, 55.2, 16.4], [60, 54.3, 19.3]], quem: 'pablo', arma: 60, chute: 68, gol: 84, alvo: [52.4, GS + 0.02, 0.5], def: ['you', [53.7, 18.4]], cam: [[50.0, 1.1, 17.0], [54.0, 0.45, 19.0], 44], placar: [1, 5] }
      ]),
      {
        id: 'fim',
        dur: 250,
        // o apito: o mundo vai embora andando (tempo normal); o Blue Lock ficou parado
        // (o Blue Lock na frente, parado; o mundo se afasta para o fundo, rumo ao norte)
        cam: { de: [[49.4, 1.0, 18.4], [53.4, 0.42, 16.4], 44], para: [[48.9, 2.3, 18.6], [53.6, 0.2, 15.8], 48], curva: 'easeIO' },
        cena(K) {
          camara(K);
        },
        atores: [
          ...['loki', 'luna', 'blake', 'dada_silva', 'pablo'].map((q, i) => ({
            quem: q,
            extra: WF,
            de: [52.2 + i * 0.5, 17.2 + (i % 2) * 0.45],
            para: [54.2 + i * 0.5, 11.6 + (i % 2) * 0.4],
            em: 20 + i * 6,
            ate: 250,
            anim: 'walk',
            frame: (t) => passo(t, 7),
            olha: [50, 8],
            luz: [1.08, 1.05, 1.0]
          })),
          // o Blue Lock onde estava, quase sem se mexer
          { quem: 'you', extra: BL, x: 53.7, y: 18.4, anim: 'kneel', olha: [49.6, 16.4], luz: [0.7, 0.75, 0.9] },
          { quem: 'bachira', extra: BL, x: 54.4, y: 17.2, anim: 'idle', olha: [52, 14], luz: [0.7, 0.75, 0.9] },
          { quem: 'aryu', extra: BL, x: 52.35, y: 18.0, anim: 'kneel_down', olha: [49.6, 16.4], luz: [0.7, 0.75, 0.9] },
          { quem: 'tokimitsu', extra: BL, x: 53.4, y: 19.3, anim: 'sit_floor', olha: [49.6, 16.4], luz: [0.7, 0.75, 0.9] },
          { quem: 'rin', extra: Object.assign({ angry: true }, BL), x: 52.9, y: 16.3, olha: [51, 12.5], luz: [0.8, 0.85, 0.95] }
        ],
        efeitos: [{ tipo: 'cor', em: 0, ate: 250, de: '#1e3a8a', forca: (t) => 0.28 * seg(t, 30, 200) }],
        letreiros: [{ em: 40, texto: 'FIM DE JOGO', cor: '#94a3b8' }],
        sons: [{ em: 4, som: 'apito', arg: 3 }],
        sobre(ctx, S) {
          placar(ctx, S, 1, 5);
        }
      }
    ]
  });

  // dois lances do mundo num plano (cortes secos de 2 s): quem é do mundo no tempo normal,
  // o defensor do Blue Lock em câmera lentíssima
  function mundo(id, lances, o = {}) {
    const D = 120;
    const lt = (t) => t - Math.min(lances.length - 1, Math.floor(t / D)) * D;
    const qual = (t) => Math.min(lances.length - 1, Math.floor(t / D));
    const atores = [];
    lances.forEach((L, i) => {
      const vis = [i * D, (i + 1) * D];
      const tl = (t) => t - i * D;
      // (cada um no tempo do seu lance; fora do corte o ator some)
      atores.push(
        Object.assign(corredor(L.quem, WF, L.kf, L.arma, L.chute, L.alvo, { bicicleta: L.bicicleta, luz: [1.1, 1.06, 1.0] }), {
          id: 'm' + i,
          tempo: (t) => tl(t),
          visivel: (t, S) => S.t >= vis[0] && S.t < vis[1]
        })
      );
      const [dq, dp] = L.def;
      atores.push({
        quem: dq,
        id: 'd' + i,
        extra: dq === 'rin' ? Object.assign({ angry: true }, BL) : BL,
        x: dp[0],
        y: dp[1],
        z: (t) => (L.bicicleta ? Math.sin(seg(t, 4, 9) * Math.PI) * 0.12 : 0),
        tempo: (t) => tl(t) * LENTO,
        anim: (t) => (L.bicicleta ? 'jump' : t > 3 ? 'run' : 'idle'),
        opts: L.bicicleta ? (t) => ({ animTime: t * 3 }) : undefined,
        frame: (t) => passo(t, 3),
        olha: [L.alvo[0], L.alvo[1] - 2],
        visivel: (t, S) => S.t >= vis[0] && S.t < vis[1],
        luz: [0.82, 0.88, 1.0]
      });
    });
    return {
      id,
      dur: D * lances.length,
      // corte seco entre os lances: a câmera troca de lugar na hora (e anda um pouco em cada)
      cam: (K, t) => {
        const L = lances[qual(t)];
        const k = seg(lt(t), 0, D);
        const [e, l, f] = L.cam;
        return [[e[0], e[1], e[2] + k * 0.35], [l[0], l[1], l[2] + k * 0.25], f];
      },
      cena(K, S, st) {
        camara(K);
        const L = lances[qual(S.t)];
        bolaCorrida(K, st, L.kf, L.chute, L.gol, L.alvo, lt(S.t), { alto: L.alto, vem: L.vem, curva: L.bicicleta ? 0.05 : 0.16 });
        const p = trilha(L.kf, lt(S.t));
        A.sombra(K, p[0], p[1], 0.24);
        A.sombra(K, L.def[1][0], L.def[1][1], 0.2);
      },
      atores,
      sons: lances.flatMap((L, i) => [
        { em: i * D + L.chute, som: 'chute', arg: 0.9 },
        { em: i * D + L.gol, som: 'gol', arg: false }
      ]),
      sobre(ctx, S, K, st) {
        const i = qual(S.t);
        const L = lances[i];
        const u = lt(S.t);
        A.rastro(ctx, st.bola0, st.bola, '251,191,36', 0.6, 8);
        placar(ctx, S, L.placar[0], u >= L.gol ? L.placar[1] : L.placar[1] - 1, 'fora', seg(u, L.gol, L.gol + 40));
      },
      ...o
    };
  }

  // ======================================================================== VITÓRIA
  // o placar final da partida (com 4 × 3 quando a cena é revista fora dela: o roteiro do jogo
  // garante os gols do Rin, do Loki, da Luna e do Blake)
  const placarFinal = () => {
    const ME = window.MatchEngine;
    if (ME && ME.chapter && ME.chapter.id === 'ch3_second_selection_world5' && ME.scoreHome > ME.scoreAway) return [ME.scoreHome, ME.scoreAway];
    return [4, 3];
  };
  // o seu gol: você no tempo normal, o World Five em câmera lentíssima (da esquerda para a
  // direita: a câmera está do lado leste, o gol norte fica à direita)
  const EU_KF = [[0, 53.75, 13.6], [118, 53.5, 9.4]];
  const EU_CH = 126;
  const EU_GOL = 140;
  const EU_ALVO = [53.0, GN - 0.02, 0.62];
  const WF_DEF = [
    ['loki', [52.95, 12.4]],
    ['pablo', [52.6, 11.2]],
    ['dada_silva', [52.95, 10.1]]
  ];
  const LKV_KF = [[0, 53.0, 11.6], [36, 53.0, 11.9], [100, 53.4, 19.6]];

  R('world_five_win', {
    titulo: 'O MUNDO SUOU',
    musica: 'epic',
    tema: 'bluelock_holo',
    grao: 0.05,
    vinheta: 0.5,
    cores: CORES,
    planos: [
      {
        id: 'loki',
        dur: 300,
        // do alto, do lado leste: a velocidade divina inteira (o rastro dourado no campo)
        cam: { de: [[58.6, 3.4, 15.2], [53.2, 0.0, 15.7], 46], para: [[58.3, 3.0, 16.6], [53.3, 0.0, 17.2], 46], curva: 'easeIO' },
        cena(K, S, st) {
          camara(K);
          bolaCorrida(K, st, LKV_KF, 106, 120, [52.4, GS + 0.02, 0.5], S.t);
          const p = trilha(LKV_KF, S.t);
          A.sombra(K, p[0], p[1], 0.25);
        },
        atores: [
          corredor('loki', WF, LKV_KF, 100, 106, [52.4, GS], { luz: [1.12, 1.08, 0.98] }),
          ...fantasmas('loki', WF, LKV_KF, 36, 100, '#fbbf24', { olha: [53.4, 25] }),
          ...DEF.map(([q, p], i) => ({ quem: q, extra: BL, x: p[0], y: p[1], tempo: lento, anim: (t) => (t > 3.6 + i ? 'run' : 'idle'), frame: (t) => passo(t, 3), olha: (t) => (t < 3.6 + i ? [53, 11] : [53.3, 23]), luz: [0.88, 0.92, 1.0] })),
          { quem: 'rin', extra: Object.assign({ angry: true }, BL), x: 52.3, y: 11.2, tempo: lento, anim: 'run', frame: (t) => passo(t, 3), olha: [53.3, 23] }
        ],
        efeitos: [
          { tipo: 'linhas', modo: 'paralelas', em: 36, ate: 100, ang: Math.PI, forca: 0.26, decai: false, entra: 6, sai: 8, cor: 'rgba(254,243,199,0.5)' },
          { tipo: 'tremor', em: 90, ate: 112, forca: 0.4, amp: 0.04 }
        ],
        falas: [{ em: 150, quem: 'JULIAN LOKI', texto: '"Desculpe. Nessa velocidade, ninguém me alcança."' }],
        letreiros: [{ em: 8, ate: 140, sai: 20, texto: '2ª SELEÇÃO • BLUE LOCK × WORLD FIVE', cor: '#38bdf8' }],
        sons: [
          { em: 36, som: 'vento' },
          { em: 106, som: 'chute', arg: 1 },
          { em: 120, som: 'gol', arg: false }
        ],
        sobre(ctx, S, K, st) {
          A.rastro(ctx, st.bola0, st.bola, '251,191,36', 0.6, 8);
          placar(ctx, S, 1, S.t >= 120 ? 1 : 0, 'fora', seg(S.t, 120, 160), seg(S.t, 4, 24));
        }
      },
      {
        id: 'aguenta',
        dur: 240,
        // o mundo vem com tudo e o Blue Lock aguenta, agora no MESMO tempo (dois cortes secos)
        cam: (K, t) => (t < 120 ? [[58.4, 0.9, 18.6 + t * 0.002], [54.3, 0.5, 19.0], 44] : [[57.8, 1.6, 16.6 + (t - 120) * 0.003], [53.6, 0.4, 18.2], 46]),
        cena(K, S, st) {
          camara(K);
          const t = S.t;
          let b;
          if (t < 120) {
            // a Luna bate; o Aryu entra de carrinho e trava
            const k = seg(t, 40, 56);
            b = t < 40 ? [54.1 + t * 0.006, 17.6 + t * 0.03, 0.06] : t < 56 ? [lerp(54.35, 54.15, k), lerp(18.8, 19.25, k), 0.1] : [lerp(54.15, 55.6, seg(t, 56, 100)), lerp(19.25, 18.2, seg(t, 56, 100)), 0.06 + Math.sin(seg(t, 56, 100) * Math.PI) * 0.4];
          } else {
            // o Blake chuta; o Tokimitsu se joga na frente
            const u = t - 120;
            b = u < 44 ? [53.9, 16.9 + u * 0.004, 0.06] : u < 58 ? [lerp(53.85, 53.6, seg(u, 44, 58)), lerp(17.1, 18.4, seg(u, 44, 58)), 0.3] : [lerp(53.6, 52.3, seg(u, 58, 110)), lerp(18.4, 17.6, seg(u, 58, 110)), 0.06 + Math.sin(seg(u, 58, 110) * Math.PI) * 0.5];
          }
          K.ball(b[0], b[1], b[2]);
          A.sombraBola(K, b[0], b[1], b[2]);
        },
        atores: [
          { quem: 'luna', extra: WF, de: [54.1, 17.5], para: [54.35, 18.75], ate: 40, anim: (t) => (t < 40 ? 'run' : t < 64 ? 'shoot' : 'idle'), frame: (t) => (t < 40 ? passo(t) : 1), olha: [54, 23], visivel: [0, 120] },
          { quem: 'aryu', extra: BL, de: [53.2, 19.4], para: [53.95, 19.2], em: 30, ate: 52, anim: (t) => (t < 30 ? 'run' : 'slide'), frame: (t) => (t < 30 ? passo(t) : undefined), opts: (t) => (t >= 30 ? { animTime: Math.min(40, (t - 30) * 1.5) } : undefined), olha: [55, 18.8], visivel: [0, 120] },
          { quem: 'blake', extra: WF, x: 53.95, y: 16.85, anim: (t) => (t < 160 ? 'windup' : t < 190 ? 'shoot' : 'idle'), frame: 1, olha: [53.6, 23], visivel: [120, 240] },
          { quem: 'tokimitsu', extra: BL, de: [53.0, 18.6], para: [53.55, 18.5], em: 150, ate: 176, z: (t) => Math.sin(seg(t, 150, 182) * Math.PI) * 0.2, anim: (t) => (t < 150 ? 'run' : 'dive'), frame: (t) => (t < 150 ? passo(t) : undefined), opts: (t) => (t >= 150 ? { animTime: Math.min(30, (t - 150) * 1.4) } : undefined), olha: [53.9, 16.5], visivel: [120, 240] },
          { quem: 'rin', extra: Object.assign({ angry: true }, BL), x: 52.6, y: 20.2, olha: [54, 17.5], visivel: [120, 240] }
        ],
        sons: [
          { em: 52, som: 'carrinho' },
          { em: 164, som: 'defesa' }
        ],
        sobre(ctx, S) {
          const [gc, gf] = placarFinal();
          placar(ctx, S, gc - 1, gf, null, 1, 1, "88'");
        }
      },
      {
        id: 'virada',
        dur: 300,
        // o tempo vira: você corre no tempo normal; o World Five quase parado (câmera do lado
        // leste, na altura do peito: você vai da esquerda para a direita)
        cam: (K, t) => {
          const p = trilha(EU_KF, Math.max(0, Math.min(t, EU_CH + 10) - 5));
          const k = ease(seg(t, EU_CH, EU_GOL + 30));
          return [[56.7, 0.62, lerp(p[1] + 0.3, 7.6, k)], [53.1, 0.5, lerp(p[1] - 0.7, 6.8, k)], 44];
        },
        cena(K, S, st) {
          camara(K);
          bolaCorrida(K, st, EU_KF, EU_CH, EU_GOL, EU_ALVO, S.t);
          const p = trilha(EU_KF, S.t);
          A.sombra(K, p[0], p[1], 0.25);
          WF_DEF.forEach(([, d]) => A.sombra(K, d[0], d[1], 0.2));
        },
        atores: [
          corredor('you', BL, EU_KF, EU_CH - 8, EU_CH, EU_ALVO, { luz: [1.08, 1.1, 1.12] }),
          ...fantasmas('you', BL, EU_KF, 20, EU_CH - 8, '#00f5d4', { olha: [53, 2] }),
          ...WF_DEF.map(([q, p], i) => ({ quem: q, extra: WF, x: p[0], y: p[1], tempo: lento, anim: (t) => (t > 5 + i ? 'run' : 'idle'), frame: (t) => passo(t, 3), olha: (t) => (t < 5 + i ? [53, 15] : [53, 5]), luz: [0.9, 0.9, 0.95] })),
          { quem: 'luna', extra: WF, x: 52.2, y: 9.2, tempo: lento, anim: 'run', frame: (t) => passo(t, 3), olha: [53, 6] },
          { quem: 'rin', extra: Object.assign({ angry: true }, BL), de: [54.4, 14.4], para: [54.2, 12.0], anim: 'correr', olha: [53, 6] }
        ],
        efeitos: [
          { tipo: 'linhas', modo: 'paralelas', em: 20, ate: EU_CH, ang: Math.PI, forca: 0.28, decai: false, entra: 6, sai: 8, cor: 'rgba(204,251,241,0.5)' },
          // o pico da vitória: a tremida forte no seu chute
          { tipo: 'tremor', em: EU_CH, ate: EU_CH + 40, forca: 0.85, amp: 0.06 }
        ],
        sons: [
          { em: 20, som: 'vento' },
          { em: EU_CH, som: 'chute', arg: 1 },
          { em: EU_GOL, som: 'gol', arg: true }
        ],
        sobre(ctx, S, K, st) {
          A.rastro(ctx, st.bola0, st.bola, '0,245,212', 0.8, 10);
          const [gc, gf] = placarFinal();
          placar(ctx, S, S.t >= EU_GOL ? gc : gc - 1, gf, 'casa', seg(S.t, EU_GOL, EU_GOL + 40), 1, S.t < EU_GOL ? "89'" : null);
        }
      },
      {
        id: 'suou',
        dur: 270,
        // o Loki vem até você depois do apito: de perfil, os dois de pé
        cam: { de: [[56.5, 0.6, 12.3], [53.3, 0.5, 12.0], 40], para: [[56.3, 0.62, 12.5], [53.3, 0.52, 12.1], 39], curva: 'easeIO' },
        cena(K) {
          camara(K);
        },
        atores: [
          { quem: 'loki', extra: WF, de: [53.35, 14.0], para: [53.35, 12.7], ate: 60, anim: (t) => (t < 60 ? 'walk' : 'idle'), frame: (t) => (t < 60 ? passo(t, 7) : undefined), olha: [53.3, 11.3], opts: { expr: 'happy' }, luz: [1.1, 1.06, 1.0] },
          { quem: 'you', extra: BL, x: 53.3, y: 11.35, olha: (t) => (t < 30 ? [53, 7] : [53.35, 12.7]), luz: [1.05, 1.08, 1.12] },
          { quem: 'bachira', extra: BL, x: 52.1, y: 10.4, anim: 'celebrate', olha: [53, 11.3] },
          { quem: 'luna', extra: WF, x: 54.5, y: 15.2, olha: [53.3, 12] }
        ],
        falas: [{ em: 64, quem: 'JULIAN LOKI', texto: '"Vocês me fizeram suar. Guarde esse nome: Julian Loki."' }],
        sons: [{ em: 2, som: 'apito', arg: 3 }],
        sobre(ctx, S) {
          const [gc, gf] = placarFinal();
          placar(ctx, S, gc, gf);
        }
      },
      {
        id: 'topo',
        dur: 300,
        // os cinco de pé no meio do campo; o mundo vai embora; a grua sobe
        cam: { de: [[57.0, 1.3, 13.4], [53.1, 0.45, 12.6], 42], para: [[58.4, 4.0, 14.2], [53.1, 0.0, 12.6], 50], curva: 'easeIO' },
        cena(K) {
          camara(K);
        },
        atores: [
          ...[['you', [53.2, 12.2]], ['rin', [52.3, 12.9]], ['bachira', [54.1, 12.8]], ['aryu', [51.9, 11.9]], ['tokimitsu', [54.5, 11.8]]].map(([q, p]) => ({
            quem: q,
            extra: q === 'rin' ? Object.assign({ angry: true }, BL) : BL,
            x: p[0],
            y: p[1],
            anim: q === 'bachira' ? 'celebrate' : 'idle',
            olha: q === 'rin' ? [51, 17] : [57.5, 13.4],
            luz: [1.06, 1.08, 1.1]
          })),
          ...['loki', 'luna', 'blake', 'dada_silva', 'pablo'].map((q, i) => ({ quem: q, extra: WF, de: [51.4 + i * 0.6, 16.0 + (i % 2) * 0.4], para: [50.4 + i * 0.6, 19.6 + (i % 2) * 0.4], em: 10 + i * 5, ate: 300, anim: 'walk', frame: (t) => passo(t, 7), olha: [50, 23] }))
        ],
        falas: [
          { em: 30, ate: 150, quem: 'JINPACHI EGO', texto: '"Vencer uma vez não é o topo."' },
          { em: 156, quem: 'JINPACHI EGO', texto: '"É a prova de que o topo existe."' }
        ],
        letreiros: [{ em: 160, texto: 'FIM DE JOGO', cor: '#94a3b8' }],
        sobre(ctx, S) {
          const [gc, gf] = placarFinal();
          placar(ctx, S, gc, gf);
        }
      }
    ]
  });
})();
