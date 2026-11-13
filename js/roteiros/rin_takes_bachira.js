// ============================================================================
// 15/16 · rin_takes_bachira / rin_takes_bachira_win — "A linha do meio" (conceito A)
// Cap. 5, 2ª Seleção, o 3 × 3 contra o Top 3 (Rin, Aryu e Tokimitsu), logo depois do jogo,
// na câmara holográfica. Quem perde entrega um jogador.
// Assinatura: a linha branca do meio de campo é a fronteira. O seu trio de um lado, o Top 3
// do outro; cruzar a linha é trocar de dono. Só o Bachira pisa nela na cena inteira.
// O pico: o passo que cruza (câmera lenta e 1 s de preto e branco total).
//   Derrota (15): a câmera do lado leste, um pouco do alto (o seu trio de joelhos, à esquerda;
//     o Top 3 de pé, à direita, com o Rin na frente). O Aryu escolhe o Bachira; ele vai.
//   Vitória (16): planos próprios, do lado oeste e na altura dos olhos (o seu trio de pé, à
//     direita; o Aryu e o Tokimitsu de joelhos). Ninguém escolhe: o Bachira dá um passo à
//     frente sozinho, cruza e para ao lado do Rin.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro || !CE.rtA) return;
  const R = CE.roteiro;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = R.seg;
  const lerp = R.lerp;
  const suave = R.curvas.suave;
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

  // cores novas (não estão na tabela do CUTSCENE_STYLE §1.2)
  const CORES = { ARYU: '#c084fc', TOKIMITSU: '#a3e635' };
  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const TEAL = { jerseyPrimary: '#134e4a', jerseySecondary: '#5eead4' };
  const RIN = Object.assign({ angry: true }, TEAL);
  const LINHA = 14.5; // a linha do meio (y)
  const CAIDO = [0.6, 0.66, 0.84]; // quem perdeu fica frio e apagado
  const andar = (t) => 1 + (Math.floor(t / 7) % 4) * 4;

  // vira para alvo, um pouco para a câmera (cam = [x, y] dela): de frente, sem ficar de perfil
  const deFrente = (p, alvo, cam, k = 0.45) => {
    const a1 = Math.atan2(alvo[1] - p[1], alvo[0] - p[0]);
    const a2 = Math.atan2(cam[1] - p[1], cam[0] - p[0]);
    let d = a2 - a1;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const a = a1 + d * k;
    return [p[0] + Math.cos(a) * 2, p[1] + Math.sin(a) * 2];
  };
  // a linha pintada ganha uma faixa acesa por cima: é ela que divide o quadro
  function linha(K, forca = 0.55) {
    K.floor({ x0: 45.8, y0: LINHA - 0.035, x1: 60.2, y1: LINHA + 0.035, z: 0.012, color: '#f8fafc', alpha: forca, em: true });
  }
  function camara(K) {
    K.sky('#01030a', '#0b1a3a', 0.5);
    K.fog('#060d1f', 0.02);
  }

  // A geometria de uma versão. lado = 1: câmera no leste (derrota); -1: no oeste (vitória),
  // tudo espelhado em x = 53. Nos dois casos o Bachira e o Rin ficam do lado da câmera.
  function geo(lado) {
    const X = (x) => 53 + (x - 53) * lado;
    const P = (x, y) => [X(x), y];
    return {
      X,
      P,
      cam: (e, l, f) => [[X(e[0]), e[1], e[2]], [X(l[0]), l[1], l[2]], f],
      trio: { bachira: P(54.0, 15.55), you: P(53.7, 16.45), nagi: P(53.4, 17.35) },
      top3: { rin: P(54.0, 13.45), aryu: P(53.7, 12.55), toki: P(53.4, 11.65) },
      antes: P(54.05, 14.84), // o Bachira para antes da linha
      depois: P(54.05, 14.2), // o pé do outro lado
      aoLado: P(54.4, 13.8), // ao lado do Rin
      camChao: P(58.0, 14.5) // onde a câmera fica (no chão), para os "de frente"
    };
  }

  // o passo que cruza: em câmera lenta, câmera rente à linha, olhando ao longo dela.
  // (tempo da ação) o pé cruza no meio da câmera lenta: real 40–190 a 0,25 → o passo (ação
  // 66) cai no quadro real ~116; a ação chega a ~130 no fim do plano
  function planoPasso(G, atores) {
    const PASSO = 66;
    return {
      id: 'linha',
      dur: 230,
      lento: { em: 40, ate: 190, fator: 0.25, rampa: 16 },
      cam: { de: G.cam([57.9, 0.5, LINHA], [53.8, 0.46, LINHA], 44), para: G.cam([57.5, 0.48, LINHA], [53.8, 0.46, LINHA], 43), curva: 'easeIO' },
      cena(K) {
        camara(K);
        linha(K, 0.75);
      },
      atores: [
        {
          quem: 'bachira',
          extra: BL,
          x: (t) => (t < PASSO + 20 ? lerp(G.antes[0], G.depois[0], suave(seg(t, PASSO - 24, PASSO + 6))) : lerp(G.depois[0], G.aoLado[0], seg(t, PASSO + 20, 150))),
          y: (t) => (t < PASSO + 20 ? lerp(G.antes[1], G.depois[1], suave(seg(t, PASSO - 24, PASSO + 6))) : lerp(G.depois[1], G.aoLado[1], seg(t, PASSO + 20, 150))),
          anim: (t) => ((t >= PASSO - 24 && t < PASSO + 6) || t >= PASSO + 20 ? 'walk' : 'idle'),
          frame: (t) => ((t >= PASSO - 24 && t < PASSO + 6) || t >= PASSO + 20 ? andar(t) : undefined),
          olha: [G.aoLado[0], G.aoLado[1] - 1],
          luz: [1.1, 1.05, 0.95]
        },
        ...atores
      ],
      efeitos: [
        // o pico: o mundo para no passo (1 s de preto e branco total, com rampa curta)
        { tipo: 'pb', em: PASSO, ate: PASSO + 15, forca: 1, entra: 2, sai: 4, tempo: 'acao' }
      ],
      sons: [{ em: 116, som: 'bip', arg: 520 }]
    };
  }

  // ======================================================================== DERROTA
  const G = geo(1);
  const CL = G.camChao;
  const trioL = (o = {}) => [
    { quem: 'nagi', extra: BL, x: G.trio.nagi[0], y: G.trio.nagi[1], anim: 'sit_floor', olha: deFrente(G.trio.nagi, G.top3.toki, CL, 0.6), luz: CAIDO },
    { quem: 'you', extra: BL, x: G.trio.you[0], y: G.trio.you[1], anim: o.you || 'sit_floor', olha: o.youOlha || deFrente(G.trio.you, G.top3.aryu, CL, 0.6), luz: o.youLuz || CAIDO }
  ];
  const top3L = (o = {}) => [
    { quem: 'aryu', extra: TEAL, x: G.top3.aryu[0], y: G.top3.aryu[1], anim: o.aryu || 'idle', frame: o.aryuFrame, olha: o.aryuOlha || deFrente(G.top3.aryu, G.trio.you, CL) },
    { quem: 'rin', extra: RIN, x: G.top3.rin[0], y: G.top3.rin[1], olha: deFrente(G.top3.rin, G.trio.bachira, CL, 0.55), luz: [0.98, 1.06, 1.12] },
    { quem: 'tokimitsu', extra: TEAL, x: G.top3.toki[0], y: G.top3.toki[1], olha: deFrente(G.top3.toki, G.trio.nagi, CL) }
  ];
  const bachiraL = (o = {}) => ({ quem: 'bachira', extra: BL, x: G.trio.bachira[0], y: G.trio.bachira[1], anim: 'sit_floor', olha: deFrente(G.trio.bachira, G.top3.rin, CL, 0.6), luz: CAIDO, ...o });

  R('rin_takes_bachira', {
    titulo: 'O MONSTRO FOI EMBORA',
    musica: 'mystery',
    tema: 'bluelock_holo',
    grao: 0.05,
    vinheta: 0.5,
    cores: CORES,
    planos: [
      {
        id: 'fim',
        dur: 240,
        // um pouco do alto: a linha corta o quadro; o Rin de frente, os três de joelhos
        cam: { de: G.cam([59.0, 2.3, 14.5], [53.7, 0.4, 14.5], 40), para: G.cam([58.6, 1.9, 14.5], [53.7, 0.4, 14.5], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [...trioL(), bachiraL(), ...top3L()],
        falas: [{ em: 40, quem: 'RIN ITOSHI', texto: '"Lentos demais. Vocês nem chegaram perto."' }],
        letreiros: [{ em: 10, ate: 200, sai: 20, texto: '2ª SELEÇÃO • TOP 3 VENCEU', cor: '#5eead4' }]
      },
      {
        id: 'escolha',
        dur: 240,
        // perto do Top 3: o Aryu aponta o Bachira
        cam: { de: G.cam([57.4, 1.2, 13.1], [53.7, 0.5, 12.7], 40), para: G.cam([57.3, 1.15, 12.8], [53.7, 0.5, 12.6], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [
          ...top3L({ aryu: (t) => (t > 120 ? 'call_pass' : 'idle'), aryuOlha: (t) => (t > 120 ? G.trio.bachira : deFrente(G.top3.aryu, G.trio.you, CL)) }),
          ...trioL(),
          bachiraL()
        ],
        falas: [
          { em: 16, ate: 118, quem: 'AOSHI TOKIMITSU', texto: '"A-a gente já decidiu..."', tipo: 'sussurro' },
          { em: 122, quem: 'JYUBEI ARYU', texto: '"O Bachira. OSHAA!"' }
        ]
      },
      {
        id: 'vai',
        dur: 250,
        // o Bachira se levanta e anda até a linha; para antes dela e se vira para você
        cam: { de: G.cam([57.3, 1.1, 15.3], [53.9, 0.5, 15.25], 40), para: G.cam([57.3, 1.1, 15.15], [53.9, 0.5, 15.1], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [
          {
            quem: 'bachira',
            extra: BL,
            x: (t) => lerp(G.trio.bachira[0], G.antes[0], suave(seg(t, 40, 150))),
            y: (t) => lerp(G.trio.bachira[1], G.antes[1], suave(seg(t, 40, 150))),
            anim: (t) => (t < 30 ? 'sit_floor' : t < 40 ? 'idle' : t < 150 ? 'walk' : 'idle'),
            frame: (t) => (t >= 40 && t < 150 ? andar(t) : undefined),
            olha: (t) => (t < 30 ? deFrente(G.trio.bachira, G.top3.rin, CL, 0.6) : t < 160 ? G.top3.rin : deFrente(G.antes, G.trio.you, CL, 0.5)),
            opts: (t) => (t > 170 ? { expr: 'happy' } : undefined),
            luz: (t) => (t < 30 ? CAIDO : [1.1, 1.05, 0.95])
          },
          ...trioL({ youOlha: (t) => [lerp(G.trio.bachira[0], G.antes[0], seg(t, 40, 150)), 15], you: 'sit_floor' }),
          // (só o Rin: o Aryu e o Tokimitsu ficam fora do quadro, sem ninguém cortado na borda)
          ...top3L().filter((a) => a.quem === 'rin')
        ],
        falas: [
          { em: 50, ate: 120, quem: 'you', texto: '"...Bachira?"' },
          { em: 166, quem: 'BACHIRA', texto: '"Desculpa... o monstro dele é mais forte."' }
        ]
      },
      planoPasso(G, [
        ...trioL({ you: 'sit_floor', youOlha: G.depois }),
        { quem: 'rin', extra: RIN, x: G.top3.rin[0], y: G.top3.rin[1], olha: G.depois, luz: [0.98, 1.06, 1.12] },
        { quem: 'aryu', extra: TEAL, x: G.top3.aryu[0], y: G.top3.aryu[1], olha: G.depois },
        { quem: 'tokimitsu', extra: TEAL, x: G.top3.toki[0], y: G.top3.toki[1], olha: G.depois }
      ]),
      {
        id: 'juramento',
        dur: 290,
        // o Top 3 e o Bachira vão embora pelo norte; você se levanta; a grua sobe
        cam: { de: G.cam([58.4, 1.6, 15.2], [53.6, 0.4, 14.5], 42), para: G.cam([59.0, 3.2, 14.9], [53.4, 0.0, 14.2], 46), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K, 0.6);
        },
        atores: [
          { quem: 'rin', extra: RIN, de: G.top3.rin, para: G.P(54.0, 9.4), em: 60, ate: 290, anim: (t) => (t > 60 ? 'walk' : 'idle'), frame: (t) => (t > 60 ? andar(t) : undefined), olha: (t) => (t > 60 ? G.P(54, 6) : G.trio.you) },
          { quem: 'bachira', extra: BL, de: G.aoLado, para: G.P(53.2, 9.8), em: 96, ate: 290, anim: (t) => (t > 96 ? 'walk' : 'idle'), frame: (t) => (t > 96 ? andar(t) : undefined), olha: (t) => (t > 96 ? G.P(53, 6) : G.trio.you) },
          { quem: 'aryu', extra: TEAL, de: G.top3.aryu, para: G.P(52.6, 9.7), em: 70, ate: 290, anim: (t) => (t > 70 ? 'walk' : 'idle'), frame: (t) => (t > 70 ? andar(t) : undefined), olha: G.P(52.5, 6) },
          { quem: 'tokimitsu', extra: TEAL, de: G.top3.toki, para: G.P(51.4, 10.1), em: 80, ate: 290, anim: (t) => (t > 80 ? 'walk' : 'idle'), frame: (t) => (t > 80 ? andar(t) : undefined), olha: G.P(51, 6) },
          { quem: 'nagi', extra: BL, x: G.trio.nagi[0], y: G.trio.nagi[1], anim: 'sit_floor', olha: deFrente(G.trio.nagi, G.P(53, 10), CL, 0.6), luz: CAIDO },
          { quem: 'you', extra: BL, x: G.trio.you[0], y: G.trio.you[1], anim: (t) => (t < 40 ? 'sit_floor' : 'idle'), olha: G.P(53.4, 11), luz: [0.98, 1.0, 1.08] }
        ],
        falas: [{ em: 70, quem: 'you', texto: '"Eu vou te buscar, Bachira."' }]
      }
    ]
  });

  // ======================================================================== VITÓRIA
  const V = geo(-1);
  const CW = V.camChao;
  const trioW = (o = {}) => [
    { quem: 'nagi', extra: BL, x: V.trio.nagi[0], y: V.trio.nagi[1], olha: o.nagiOlha || deFrente(V.trio.nagi, V.top3.toki, CW), luz: [1.05, 1.05, 1.05] },
    { quem: 'you', extra: BL, x: V.trio.you[0], y: V.trio.you[1], olha: o.youOlha || deFrente(V.trio.you, V.top3.aryu, CW), luz: [1.05, 1.05, 1.05] }
  ];
  const top3W = (o = {}) => [
    { quem: 'aryu', extra: TEAL, x: V.top3.aryu[0], y: V.top3.aryu[1], anim: o.aryu || 'sit_floor', olha: deFrente(V.top3.aryu, V.trio.you, CW, 0.6), luz: CAIDO },
    { quem: 'rin', extra: RIN, x: V.top3.rin[0], y: V.top3.rin[1], olha: o.rinOlha || deFrente(V.top3.rin, V.trio.bachira, CW, 0.55), luz: [0.95, 1.02, 1.08] },
    { quem: 'tokimitsu', extra: TEAL, x: V.top3.toki[0], y: V.top3.toki[1], anim: o.toki || 'sit_floor', olha: deFrente(V.top3.toki, V.trio.nagi, CW, 0.6), luz: CAIDO }
  ];
  const PASSO1 = V.P(54.05, 15.2); // o passo à frente do trio

  R('rin_takes_bachira_win', {
    titulo: 'O MONSTRO ESCOLHEU',
    musica: 'mystery',
    tema: 'bluelock_holo',
    grao: 0.05,
    vinheta: 0.5,
    cores: CORES,
    planos: [
      {
        id: 'fim',
        dur: 240,
        // na altura dos olhos, do lado oeste: o seu trio de pé à direita, o Top 3 à esquerda
        cam: { de: V.cam([58.4, 1.05, 14.9], [53.7, 0.5, 14.5], 40), para: V.cam([58.8, 1.1, 14.4], [53.7, 0.5, 14.5], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [
          ...trioW(),
          { quem: 'bachira', extra: BL, x: V.trio.bachira[0], y: V.trio.bachira[1], z: (t) => (t < 64 ? Math.abs(Math.sin(t * 0.1)) * 0.12 : 0), anim: (t) => (t < 64 ? 'celebrate' : 'idle'), olha: deFrente(V.trio.bachira, V.top3.rin, CW), luz: [1.05, 1.05, 1.05] },
          ...top3W()
        ],
        falas: [{ em: 70, quem: 'RIN ITOSHI', texto: '"Ganhou hoje. Não muda nada."' }],
        letreiros: [{ em: 10, ate: 200, sai: 20, texto: '2ª SELEÇÃO • VOCÊS VENCERAM', cor: '#38bdf8' }]
      },
      {
        id: 'eu_vou',
        dur: 230,
        // perto do seu trio: o Bachira dá um passo à frente, sozinho
        cam: { de: V.cam([57.3, 0.95, 16.6], [53.7, 0.5, 16.6], 40), para: V.cam([57.2, 0.95, 16.35], [53.7, 0.5, 16.35], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [
          {
            quem: 'bachira',
            extra: BL,
            x: (t) => lerp(V.trio.bachira[0], PASSO1[0], suave(seg(t, 50, 100))),
            y: (t) => lerp(V.trio.bachira[1], PASSO1[1], suave(seg(t, 50, 100))),
            anim: (t) => (t >= 50 && t < 100 ? 'walk' : 'idle'),
            frame: (t) => (t >= 50 && t < 100 ? andar(t) : undefined),
            olha: (t) => (t < 50 ? deFrente(V.trio.bachira, V.top3.rin, CW) : deFrente(PASSO1, V.top3.rin, CW, 0.3)),
            opts: { expr: 'happy' },
            luz: [1.1, 1.05, 0.95]
          },
          ...trioW({ youOlha: (t) => (t < 60 ? deFrente(V.trio.you, V.top3.rin, CW) : PASSO1), nagiOlha: (t) => (t < 70 ? deFrente(V.trio.nagi, V.top3.aryu, CW) : PASSO1) }),
          ...top3W({ rinOlha: (t) => (t < 100 ? deFrente(V.top3.rin, V.trio.you, CW, 0.55) : PASSO1) })
        ],
        falas: [{ em: 104, quem: 'BACHIRA', texto: '"Eu vou com o Rin."' }]
      },
      {
        id: 'monstro',
        dur: 250,
        // ele anda até a linha; você o chama; ele para e se vira
        cam: { de: V.cam([57.3, 0.95, 15.3], [53.9, 0.5, 15.25], 40), para: V.cam([57.3, 0.95, 15.15], [53.9, 0.5, 15.1], 40), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K);
        },
        atores: [
          {
            quem: 'bachira',
            extra: BL,
            x: (t) => lerp(PASSO1[0], V.antes[0], suave(seg(t, 20, 110))),
            y: (t) => lerp(PASSO1[1], V.antes[1], suave(seg(t, 20, 110))),
            anim: (t) => (t >= 20 && t < 110 ? 'walk' : 'idle'),
            frame: (t) => (t >= 20 && t < 110 ? andar(t) : undefined),
            olha: (t) => (t < 120 ? V.top3.rin : deFrente(V.antes, V.trio.you, CW, 0.5)),
            opts: { expr: 'happy' },
            luz: [1.1, 1.05, 0.95]
          },
          ...trioW({ youOlha: V.antes, nagiOlha: V.antes }),
          ...top3W({ rinOlha: V.antes }).filter((a) => a.quem === 'rin')
        ],
        falas: [
          { em: 16, ate: 70, quem: 'you', texto: '"Bachira?"' },
          { em: 124, quem: 'BACHIRA', texto: '"O monstro dele é mais forte... eu quero jogar com ele."' }
        ]
      },
      planoPasso(V, [
        ...trioW({ youOlha: V.depois, nagiOlha: V.depois }),
        ...top3W({ rinOlha: V.depois })
      ]),
      {
        id: 'juramento',
        dur: 290,
        // o Bachira ao lado do Rin, do outro lado da linha; você de pé, do seu lado
        cam: { de: V.cam([57.6, 1.1, 13.7], [53.8, 0.45, 14.3], 42), para: V.cam([58.6, 2.6, 14.3], [53.6, 0.1, 14.4], 46), curva: 'easeIO' },
        cena(K) {
          camara(K);
          linha(K, 0.6);
        },
        atores: [
          { quem: 'rin', extra: RIN, x: V.top3.rin[0], y: V.top3.rin[1], olha: (t) => (t < 150 ? V.trio.you : V.P(54, 8)), luz: [0.95, 1.02, 1.08] },
          { quem: 'bachira', extra: BL, x: V.aoLado[0], y: V.aoLado[1], olha: (t) => (t < 150 ? deFrente(V.aoLado, V.trio.you, CW, 0.4) : V.P(53, 8)), opts: { expr: 'happy' }, luz: [1.1, 1.05, 0.95] },
          ...top3W({ aryu: (t) => (t < 120 ? 'sit_floor' : 'idle'), toki: (t) => (t < 130 ? 'sit_floor' : 'idle') }).filter((a) => a.quem !== 'rin'),
          ...trioW({ youOlha: V.aoLado, nagiOlha: V.aoLado })
        ],
        falas: [{ em: 50, quem: 'you', texto: '"Eu vou te buscar, Bachira."' }]
      }
    ]
  });
})();
