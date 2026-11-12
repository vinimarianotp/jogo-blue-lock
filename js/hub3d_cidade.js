// ============================================================================
// A CIDADE (da carreira profissional em diante: o seu apartamento fica no centro)
// Pela porta de baixo do apartamento você desce para a portaria e sai num bairro inteiro:
//   RUA DA VITÓRIA (a do seu prédio): fachadas com janelas acesas, lojas, banca de jornal
//     com você na capa, ponto de táxi, postes, carros parados; no fim dela a PRAÇA DA
//     QUADRA (a criançada jogando bola, o telão com a sua cara e o DESAFIO DA CRIANÇADA).
//   AVENIDA DOS CAMPEÕES: sai da rua para o sul, larga, com canteiro de árvores no meio,
//     ponto de ônibus, metrô (ESTAÇÃO VITÓRIA) e semáforos; acaba na ESTAÇÃO CENTRAL, com
//     um outdoor gigante seu em cima.
//   CALÇADÃO DO COMÉRCIO (só pedestres): mercadinho, GOLAÇO LANCHES (dá para comprar um
//     lanche que recarrega 1 de energia de treino), barbearia, cantina com mesas na
//     calçada, padaria, carrinho de pipoca, pombos.
//   RUA DAS TORRES: prédios altos com outdoors (um com você), a MEGALOJA do seu clube com
//     fãs de camisa esperando na porta, games, ramen, karaokê.
//   PARQUE DO LAGO: lago com chafariz e patos, pista de corrida em volta, cerejeiras,
//     parquinho, sorveteiro e a ESTAÇÃO PARQUE do metrô (vai e volta da Estação Vitória).
// Pedestres andam pelas calçadas, correm no parque, passeiam com o cachorro, sentam nos
// bancos e nas mesas; quem te reconhece para, acena e pede autógrafo ou selfie (E / tocar
// perto dele). Quanto mais gols e títulos, mais gente te reconhece.
//
// Onde fica: ao SUL do prédio, nas linhas 35-79 da grade (o prédio usa 0-33; o vazio das
// cenas de cinema fica em x 86, fora da grade). Nos outros temas essas linhas nem são
// montadas (js/hub3d.js: mapFor / map.rows).
//   x:  0   1 ........ 24 25 ..... 35 36 .......... 60 61
//   y 36-44  RUA DA VITÓRIA (x 1-44) ............. PRAÇA (45-60)
//   y 45-54  quarteirão A  | AVENIDA |  quarteirão B
//   y 55-63  CALÇADÃO      | (cruza) |  RUA DAS TORRES
//   y 64-78  PARQUE DO LAGO| AVENIDA |  quarteirão D (torres)
//            (a avenida acaba na Estação Central, y 78)
// O motor (js/hub3d.js e js/hub3d_gl.js) chama daqui: carve (planta), wall (paredes),
// boxes (caixas, num atlas de texturas só para o 3D), sprites, lights, paintFloor (chão),
// ambient/air/sunMap (luz, céu e sombra do sol) e a gente da rua: npcs, spotOf, interact,
// spots/act (lanchonete, metrô, desafio), onArea, miniColor/miniMarks/miniPeds (minimapa).
// ============================================================================
(function () {
  const Hub = window.Hub;
  if (!Hub) return;
  const App = () => window.App || {};
  const PR = () => window.PixelRenderer;
  const sh = (c, k) => PR().shade(c, k);

  // ---------------------------------------------------------------- planta
  const Y0 = 35; // a cidade começa nesta linha (a porta da rua)
  const MWC = 62; // largura da grade (js/hub3d.js: MW)
  const ROWS_C = 45; // linhas da cidade (35-79)
  // RUA DA VITÓRIA (y 36-44): fachadas do norte, calçada, meio-fio, asfalto, calçada, fachadas do sul
  const FN0 = 36.0; // fachadas do norte (caixas de 36,0 a 36,5)
  const FN1 = 36.5;
  const CURB_N = 38.5; // meio-fio do norte / do sul
  const CURB_S = 41.5;
  const FS0 = 44.1; // fachadas do sul (caixas de 44,1 a 44,98)
  const FS1 = 44.98;
  const STREET_X1 = 43.4; // o asfalto acaba aqui (frades): dali em diante é a praça
  // AVENIDA (x 25-35): fachada oeste 25-25,5 | calçada 25,5-28 | pista 28-30 | canteiro 30-31 |
  // pista 31-33 | calçada 33-35,5 | fachada leste 35,5-36. O asfalto vai até y 76 (praça da estação)
  const AV = { w1: 25.5, cw: 28.0, m0: 30.0, m1: 31.0, ce: 33.0, e0: 35.5, end: 76.0, y1: 78.4 };
  // SEGUNDA RUA (y 55-63): calçadão a oeste (x 1-24), rua das torres a leste (x 36-60)
  const R2 = { f0: 55.0, f1: 55.5, cn: 58.0, cs: 61.0, s0: 63.5, s1: 64.0, b0: 58.4, b1: 60.6 };
  // PARQUE (x 1-24, y 64-78): lago com chafariz, pista de corrida em volta
  const LAKE = { x: 12.0, y: 71.2, rx: 5.0, ry: 3.0 };
  const TRACK = { x: 12.0, y: 71.2, rx: 8.4, ry: 5.7, hw: 0.46 };
  const FENCE_Y = 63.62; // grade do parque (do lado do calçadão)
  const COURT = { x0: 47, y0: 37, x1: 57, y1: 43 }; // quadra da praça
  const DOOR_X = 13; // porta do apartamento (13, 30) e da rua (13, 35)
  const GAP0 = 13.0; // entrada do seu prédio na fachada (a largura da porta)
  const GAP1 = 14.0;
  const CITY_AREAS = { portaria: 1, rua: 1, praca: 1, avenida: 1, comercio: 1, torres: 1, parque: 1 };
  const OUT_AREAS = { rua: 1, praca: 1, avenida: 1, comercio: 1, torres: 1, parque: 1 };
  // faixas de pedestre: [x0, y0, x1, y1, barras na horizontal (rua leste-oeste)?]
  const CW_A = [12.45, 14.55]; // na frente do seu prédio
  const ZEBRAS = [
    [12.45, CURB_N + 0.16, 14.55, CURB_S - 0.16, 1],
    [22.35, CURB_N + 0.16, 24.45, CURB_S - 0.16, 1],
    [36.35, CURB_N + 0.16, 38.45, CURB_S - 0.16, 1],
    [AV.cw + 0.16, 42.25, AV.ce - 0.16, 44.05, 0], // boca da avenida
    [AV.cw + 0.16, 53.35, AV.ce - 0.16, 55.15, 0], // avenida, antes do cruzamento
    [AV.cw + 0.16, 63.9, AV.ce - 0.16, 65.7, 0], // avenida, depois do cruzamento
    [33.4, R2.cn + 0.16, 35.2, R2.cs - 0.16, 1], // rua das torres (ponta oeste)
    [58.0, R2.cn + 0.16, 59.8, R2.cs - 0.16, 1] // rua das torres (ponta leste)
  ];
  // canteiro do meio da avenida (trechos)
  const MEDIAN = [[45.7, 52.7], [66.3, 75.2]];

  // prédios: [a0, a1, altura, estilo, loja, cor] ao longo de cada fileira
  // RUA DA VITÓRIA, lado norte (frente para o sul)
  const NORTH = [
    [1.6, 8.6, 5.2, 'brick', 'LIVRARIA', '#a16207'],
    [8.6, 17.4, 7.2, 'home', '', ''], // o seu prédio (entrada no meio)
    [17.4, 24.0, 5.6, 'stucco', 'FLORES', '#db2777'],
    [24.0, 31.6, 6.4, 'glass', 'RESTAURANTE', '#dc2626'],
    [31.6, 38.0, 5.0, 'brick', 'CINEMA', '#facc15'],
    [38.0, 44.6, 6.8, 'stucco', 'HOTEL', '#38bdf8'],
    [44.6, 52.4, 4.4, 'brick', 'ESCOLINHA', '#22c55e'],
    [52.4, 60.4, 5.8, 'glass', '', '']
  ];
  // as fileiras: lado do prédio na rua (N = do lado norte, frente para o sul; S = frente para o
  // norte; W = do lado oeste, frente para o leste; E = frente para o oeste), [p0, p1] = de onde
  // até onde vai a caixa na outra direção, deep = quanto o prédio entra no quarteirão (sombra)
  const ROWS = [
    // rua da vitória, lado sul (quarteirões A e B)
    { side: 'S', p: [FS0, FS1], deep: 5, seed: 20, list: [
      [1.6, 7.2, 4.6, 'brick', 'LAVANDERIA', '#38bdf8'],
      [7.2, 12.0, 5.6, 'stucco', 'FARMACIA', '#22c55e'],
      [12.0, 18.6, 6.2, 'glass', 'ESPORTES', '#ef4444'],
      [18.6, 25.0, 4.8, 'stucco', 'CAFE', '#fb923c'],
      [36.0, 44.0, 4.6, 'brick', 'PET SHOP', '#60a5fa'],
      [44.0, 52.5, 3.8, 'stucco', 'SORVETES', '#f472b6'],
      [52.5, 60.4, 5.0, 'brick', 'PIZZARIA', '#f97316']
    ] },
    // avenida, lado oeste (quarteirão A) e leste (quarteirão B)
    { side: 'W', p: [25.0, AV.w1], deep: 5, seed: 60, list: [
      [44.1, 49.4, 7.0, 'glass', 'BANCO', '#38bdf8'],
      [49.4, 55.0, 5.4, 'brick', 'OTICA', '#a78bfa']
    ] },
    { side: 'E', p: [AV.e0, 36.0], deep: 5, seed: 64, list: [
      [44.1, 49.8, 6.6, 'stucco', 'TEATRO', '#e11d48'],
      [49.8, 55.0, 5.2, 'glass', 'ACADEMIA', '#22d3ee']
    ] },
    // calçadão, lado norte (quarteirão A)
    { side: 'N', p: [R2.f0, R2.f1], deep: 5, seed: 70, list: [
      [1.0, 5.4, 4.8, 'brick', 'MERCADINHO', '#4ade80'],
      [5.4, 10.8, 5.4, 'stucco', 'GOLACO LANCHES', '#facc15', { lanche: true }],
      [10.8, 14.4, 4.4, 'brick', 'BARBEARIA', '#60a5fa'],
      [14.4, 20.2, 6.0, 'glass', 'CANTINA', '#dc2626'],
      [20.2, 25.5, 5.6, 'stucco', 'PADARIA', '#f59e0b']
    ] },
    // rua das torres, lado norte (quarteirão B)
    { side: 'N', p: [R2.f0, R2.f1], deep: 5, seed: 80, list: [
      [35.5, 45.0, 6.4, 'glass', 'MEGALOJA', '', { mega: true }],
      [45.0, 50.4, 5.0, 'brick', 'GAMES', '#a855f7'],
      [50.4, 55.6, 5.8, 'stucco', 'RAMEN', '#ef4444'],
      [55.6, 60.4, 4.6, 'brick', 'KARAOKE', '#ec4899']
    ] },
    // rua das torres, lado sul e avenida, lado leste (quarteirão D: as torres)
    { side: 'S', p: [R2.s0, R2.s1], deep: 7, seed: 90, list: [
      [35.5, 43.4, 12.5, 'tower', 'CELULARES', '#38bdf8'],
      [43.4, 51.0, 9.6, 'tower2', 'CAFETERIA', '#fb923c', { ad: 'refri' }],
      [51.0, 60.4, 13.5, 'tower', 'HOTEL ASTRO', '#fbbf24', { ad: 'tv' }]
    ] },
    { side: 'E', p: [AV.e0, 36.0], deep: 7, seed: 95, list: [
      [64.0, 71.2, 14.0, 'tower', '', ''],
      [71.2, 78.4, 11.0, 'tower2', 'BANCO 24H', '#22c55e']
    ] },
    // fundo do parque: casinhas (sul) e o muro com casas (oeste)
    { side: 'S', p: [78.4, 78.98], deep: 2, seed: 100, list: [
      [1.0, 6.2, 3.6, 'house', '', '#fca5a5'],
      [6.2, 11.0, 4.2, 'house', '', '#fde68a'],
      [11.0, 16.4, 3.4, 'house', '', '#a7f3d0'],
      [16.4, 21.0, 4.0, 'house', '', '#bfdbfe'],
      [21.0, 25.0, 4.6, 'house', '', '#ddd6fe']
    ] },
    { side: 'W', p: [1.0, 1.45], deep: 2, seed: 110, list: [
      [64.0, 68.8, 3.8, 'house', '', '#fed7aa'],
      [68.8, 73.4, 3.2, 'house', '', '#d9f99d'],
      [73.4, 78.4, 4.0, 'house', '', '#fbcfe8']
    ] }
  ];
  // carros parados: [x, y, para onde aponta (E/W/N/S), cor] (6 cores: as da mesma cor dividem as texturas)
  const CARS = [
    // rua da vitória (os de cima para o leste, os de baixo para o oeste)
    [2.6, CURB_N + 0.1, 'E', '#b91c1c'], [18.6, CURB_N + 0.1, 'E', '#e5e7eb'], [25.6, CURB_N + 0.1, 'E', '#1d4ed8'], [39.4, CURB_N + 0.1, 'E', '#facc15'],
    [5.4, CURB_S - 0.95, 'W', '#1f2937'], [16.0, CURB_S - 0.95, 'W', '#e5e7eb'], [24.9, CURB_S - 0.95, 'W', '#b91c1c'], [39.0, CURB_S - 0.95, 'W', '#1d4ed8'],
    // avenida (a oeste descendo, a leste subindo)
    [AV.cw + 0.1, 48.6, 'S', '#0f766e'], [AV.cw + 0.1, 67.4, 'S', '#e5e7eb'], [AV.cw + 0.1, 71.2, 'S', '#facc15'],
    [AV.ce - 0.95, 50.8, 'N', '#1f2937'], [AV.ce - 0.95, 68.6, 'N', '#b91c1c'], [AV.ce - 0.95, 73.0, 'N', '#1d4ed8'],
    // rua das torres
    [39.0, R2.cn + 0.1, 'E', '#1f2937'], [44.6, R2.cn + 0.1, 'E', '#0f766e'], [52.4, R2.cn + 0.1, 'E', '#e5e7eb'],
    [41.4, R2.cs - 0.95, 'W', '#facc15'], [48.6, R2.cs - 0.95, 'W', '#b91c1c'], [54.6, R2.cs - 0.95, 'W', '#1d4ed8']
  ];
  // postes de luz: [x, y, para onde o braço aponta: 1 = sul, -1 = norte, 2 = leste, -2 = oeste]
  const POSTS = [
    [6, 38.3, 1], [18, 38.3, 1], [29.6, 38.3, 1], [41.4, 38.3, 1],
    [4.2, 41.72, -1], [10.2, 41.72, -1], [20.6, 41.72, -1], [34.0, 41.72, -1], [40.2, 41.72, -1],
    [45.5, 43.75, -1], [57.8, 36.4, 1],
    // avenida (calçadas)
    [AV.cw - 0.25, 50.6, 2], [AV.cw - 0.25, 69.4, 2], [AV.ce + 0.25, 46.2, -2], [AV.ce + 0.25, 70.2, -2], [AV.cw - 0.25, 74.6, 2],
    // rua das torres
    [40.4, R2.cn - 0.22, 1], [48.0, R2.cn - 0.22, 1], [56.0, R2.cn - 0.22, 1], [44.2, R2.cs + 0.22, -1], [52.6, R2.cs + 0.22, -1]
  ];
  // postes duplos no canteiro da avenida
  const MPOSTS = [48.4, 51.6, 68.0, 71.6];
  // postes de praça (4 lâmpadas) no meio do calçadão e no parque
  const GLOBES = [[4.4, 59.5], [11.6, 59.5], [18.8, 59.5], [4.6, 66.0], [21.0, 69.4], [7.2, 77.3], [17.6, 77.2]];
  // árvores: [x, y, tipo] (0 = copa redonda, 1 = cerejeira, 2 = arbusto alto)
  const TREES = [
    [7.3, 41.85, 0], [16.4, 41.85, 0], [26.6, 41.95, 0], [37.2, 41.85, 0], [45.6, 36.9, 0], [58.6, 36.9, 0],
    // canteiro da avenida
    [30.5, 46.6, 0], [30.5, 50.0, 0], [30.5, 67.0, 1], [30.5, 70.0, 0], [30.5, 73.4, 1],
    // calçadão (no canteiro do meio)
    [2.6, 59.5, 0], [14.6, 59.5, 1], [21.8, 59.5, 0],
    // rua das torres (calçada de baixo)
    [38.0, 61.45, 2], [47.6, 61.45, 2], [56.4, 61.45, 2],
    // parque: cerejeiras e árvores em volta da pista
    [2.4, 65.4, 0], [2.0, 69.2, 1], [2.1, 73.0, 0], [8.0, 64.6, 1], [15.8, 64.5, 1], [20.0, 64.6, 2],
    [22.6, 69.0, 1], [22.4, 73.8, 0], [21.4, 77.4, 1], [14.6, 77.9, 0], [8.4, 77.6, 2],
    [6.4, 68.0, 1], [17.6, 68.0, 1], [6.6, 74.4, 0], [17.4, 74.6, 1]
  ];
  const BANCA = { x0: 19.4, x1: 21.6, y0: 43.15, y1: 43.98 };
  const BUS = { y0: 47.0, y1: 49.8 }; // abrigo do ônibus (avenida, calçada leste)
  const BOARD = { x0: 59.18, x1: 59.44, y0: 37.4, y1: 42.6, z0: 2.05, z1: 4.75 }; // telão (virado para o oeste)
  // metrô: dois pavilhões (a entrada com a escada) — Estação Vitória (na avenida) e Estação Parque
  const METRO = [
    { id: 'vitoria', name: 'ESTACAO VITORIA', x0: 25.62, y0: 45.3, x1: 26.92, y1: 46.9, face: 'E', out: [27.45, 46.4, Math.PI / 2] },
    { id: 'parque', name: 'ESTACAO PARQUE', x0: 21.5, y0: 64.45, x1: 23.1, y1: 65.75, face: 'N', out: [21.9, 63.95, 0] }
  ];
  const LANCHE = { x0: 6.1, x1: 9.9, y0: 55.95, y1: 56.4 }; // balcão da lanchonete na calçada
  const TABLES = [[15.5, 56.55], [17.3, 56.55], [19.1, 56.55]]; // mesas da cantina
  const PIPOCA = { x: 8.6, y: 59.5 }; // carrinho de pipoca (canteiro do calçadão)
  const SORVETE = { x: 20.2, y: 75.6 }; // carrinho de sorvete (parque)
  const BENCHES = [
    // [x0, y0, x1, y1] (bancos de madeira)
    [45.3, 38.0, 45.75, 39.2], [45.3, 40.8, 45.75, 42.0], // praça
    [5.6, 58.95, 6.8, 59.35], [16.4, 59.65, 17.6, 60.05], // calçadão
    [11.4, 64.15, 12.6, 64.5], [1.6, 70.6, 1.95, 71.8], [11.4, 78.0, 12.6, 78.35], [22.5, 67.2, 22.85, 68.4] // parque
  ];

  // ---------------------------------------------------------------- utilidades
  const hash = (a, b) => (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0;
  const rnd01 = (i, s) => {
    let h = hash(i * 7919 + 13, s * 104729 + 7);
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const prof = () => (App().state && App().state.profile) || {};
  const clubOf = () => {
    const s = App().state || {};
    return (window.PRO_CLUBS || {})[s.proClub] || null;
  };
  const meName = () => String(prof().name || 'VOCÊ').toUpperCase();
  const meShirt = () => String(prof().shirtName || prof().name || 'VOCÊ').toUpperCase();
  const noAcc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const clubShort = () => noAcc((clubOf() && clubOf().name) || 'LIGA').split(' ').sort((a, b) => b.length - a.length)[0].slice(0, 10);
  // você no uniforme do clube (capa da revista, telão, outdoors)
  function meCd(th) {
    const p = prof();
    return { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: th.acc, jerseySecondary: th.acc2, number: p.number };
  }
  // em que área fica um ponto (para as luzes e os testes)
  function areaAt(x, y) {
    if (y < 36) return 'portaria';
    if (y < 45) return x >= 45 ? 'praca' : 'rua';
    if (x >= 25 && x < 36) return 'avenida';
    if (y >= 55 && y < 64) return x < 25 ? 'comercio' : 'torres';
    return 'parque';
  }

  // fama: quanta gente na rua te reconhece (0,2 a 0,92). Gols, títulos e a Bola de Ouro
  function fame() {
    const s = App().state || {};
    const ach = s.unlockedAchievements || [];
    let f = 0.2;
    f += Math.min(0.26, (s.careerGoals || 0) * 0.004);
    ['ach_u20_win', 'ach_four_egos', 'ach_nel_champion', 'ach_most_valuable', 'ach_pro_champion', 'ach_world_cup'].forEach((a) => {
      if (ach.includes(a)) f += 0.06;
    });
    if (ach.includes('ach_ballon_dor')) f += 0.2;
    if (s.pro && s.pro.games) f += Math.min(0.1, s.pro.games * 0.012);
    return clamp(f, 0.2, 0.92);
  }
  const stars = (f) => `${Math.max(1, Math.round(f * 5))}/5 ⭐`;

  const C = {};
  C.inCity = (area) => !!CITY_AREAS[area];
  C.outdoor = (area) => !!OUT_AREAS[area];
  C.fame = fame;

  // ---------------------------------------------------------------- planta (js/hub3d.js: buildMap)
  C.carve = function (K) {
    const { carve, F } = K;
    // portaria: um saguão pequeno entre o apartamento e a rua
    carve('portaria', 11, 31, 15, 34);
    carve('portaria', DOOR_X, 30, DOOR_X, 30); // porta do apartamento
    carve('portaria', DOOR_X, 35, DOOR_X, 35); // porta de vidro da rua
    // as ruas, a praça e o parque (o resto é quarteirão maciço)
    carve('rua', 1, 36, 44, 44);
    carve('praca', 45, 36, 60, 44);
    carve('avenida', 25, 45, 35, 78);
    carve('comercio', 1, 55, 24, 63);
    carve('torres', 36, 55, 60, 63);
    carve('parque', 1, 64, 24, 78);
    // paredes da portaria: caixas de correio, elevadores, avisos, o escudo do clube e o vidro
    F(11, 30, 'S', 'mail');
    F(12, 30, 'S', 'mail:2');
    F(14, 30, 'S', 'elev');
    F(15, 30, 'S', 'elev:2');
    F(10, 32, 'E', 'board');
    F(10, 33, 'E', 'board2');
    F(16, 32, 'W', 'logo');
    F(16, 33, 'W', 'plate:PORTARIA');
    [11, 12, 14, 15].forEach((x) => F(x, 35, 'N', 'glass'));
  };

  // ---------------------------------------------------------------- paredes (js/hub3d.js: makeWallTex)
  C.wall = function (k, a1, a2, g, e, th, K) {
    const { R, txt, TW, TH } = K;
    if (k === 'mail') {
      // caixas de correio: uma com a carta (o envelope com o selo vermelho da seleção)
      R(g, 6, 22, 52, 46, '#1c1917');
      R(g, 7, 23, 50, 44, '#78716c');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = 9 + c * 12;
        const y = 25 + r * 10;
        R(g, x, y, 10, 8, '#a8a29e');
        R(g, x, y, 10, 1, '#d6d3d1');
        R(g, x + 2, y + 3, 6, 1, '#292524');
        txt(g, String((a1 === '2' ? 1205 : 1201) + r * 10 + c).slice(-2), x + 5, y + 4, '#44403c', 1);
      }
      if (a1 !== '2') {
        R(g, 34, 33, 9, 6, '#f8fafc');
        R(g, 37, 35, 3, 2, '#dc2626');
      }
      R(g, 6, 70, 52, 2, '#44403c');
      return;
    }
    if (k === 'elev') {
      // elevador: portas de aço, o mostrador do andar aceso e o botão de chamar
      R(g, 10, 14, 44, TH - 22, '#1c1917');
      R(g, 12, 26, 40, TH - 34, '#a8a29e');
      R(g, 31, 26, 2, TH - 34, '#57534e');
      for (let y = 30; y < TH - 10; y += 6) {
        R(g, 14, y, 15, 1, '#c7c2bd');
        R(g, 35, y, 15, 1, '#c7c2bd');
      }
      R(g, 22, 16, 20, 8, '#020617');
      txt(g, a1 === '2' ? '12' : 'T', 32, 18, '#f87171', 1);
      txt(e, a1 === '2' ? '12' : 'T', 32, 18, '#fff', 1);
      R(g, 55, 50, 4, 8, '#292524');
      R(g, 56, 52, 2, 2, '#fbbf24');
      R(e, 56, 52, 2, 2, '#fff');
      return;
    }
    if (k === 'glass') {
      // vidro fumê da portaria (serve de dia e de noite): o reflexo do saguão, a silhueta
      // dos prédios do outro lado da rua e as faixas de brilho no vidro
      R(g, 2, 6, TW - 4, TH - 12, '#0b0f1a');
      R(g, 4, 8, TW - 8, TH - 16, '#1e293b');
      R(g, 4, 8, TW - 8, 28, '#334155');
      [[4, 22], [14, 16], [26, 24], [40, 12], [50, 20]].forEach(([x, hh]) => R(g, x, 36 - hh, 10, hh, '#253244'));
      R(g, 4, 36, TW - 8, 2, '#475569');
      R(g, 4, TH - 24, TW - 8, 16, '#151d2b');
      for (let i = 0; i < 3; i++) {
        g.fillStyle = 'rgba(226,232,240,0.16)';
        g.beginPath();
        g.moveTo(10 + i * 18, 8);
        g.lineTo(16 + i * 18, 8);
        g.lineTo(4 + i * 18, TH - 8);
        g.lineTo(-2 + i * 18, TH - 8);
        g.fill();
      }
      R(g, 31, 8, 2, TH - 16, '#020617');
      R(g, 4, 52, TW - 8, 2, '#020617');
      R(g, 8, 12, 10, 1, 'rgba(255,255,255,0.4)');
      R(g, 8, 14, 6, 1, 'rgba(255,255,255,0.25)');
    }
  };

  // ---------------------------------------------------------------- texturas da cidade
  const FD = 24; // texels por ladrilho nas fachadas (prédio grande, pixel mais grosso)
  const WALLC = { brick: '#7c2d12', stucco: '#a8977d', home: '#3f3a36', glass: '#1e293b', tower: '#14233a', tower2: '#6b6460', station: '#57534e' };
  // ladrilho da textura de cada estilo de parede (tijolo, reboco, vidro, concreto)
  const TILES = new Map();
  function wallTile(style, wall) {
    const k = style + wall;
    if (TILES.has(k)) return TILES.get(k);
    const cv = document.createElement('canvas');
    cv.width = 24;
    cv.height = 24;
    // (canvas na memória, como as texturas: desenhar dele não espera a placa de vídeo)
    const g = cv.getContext('2d', { willReadFrequently: true });
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    R(0, 0, 24, 24, wall);
    let s = 7 + style.length * 31;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    if (style === 'brick') {
      for (let y = 0; y < 24; y += 3) {
        R(0, y, 24, 1, sh(wall, -0.28));
        for (let x = (y / 3) % 2 ? 0 : 3; x < 24; x += 6) R(x, y, 1, 3, sh(wall, -0.22));
      }
      for (let i = 0; i < 8; i++) R(Math.floor(rnd() * 23), Math.floor(rnd() * 24), 2, 1, sh(wall, rnd() < 0.5 ? 0.12 : -0.12));
    } else if (style === 'stucco' || style === 'house') {
      for (let i = 0; i < 14; i++) R(Math.floor(rnd() * 24), Math.floor(rnd() * 24), 1, 1, sh(wall, rnd() < 0.5 ? 0.08 : -0.1));
    } else if (style === 'glass' || style === 'tower') {
      R(0, 0, 1, 24, sh(wall, -0.4));
      R(12, 0, 1, 24, sh(wall, -0.4));
    } else {
      for (let i = 0; i < 9; i++) R(Math.floor(rnd() * 24), Math.floor(rnd() * 24), 1, 1, sh(wall, 0.08));
    }
    TILES.set(k, cv);
    return cv;
  }
  // fachada inteira de um prédio (w x h em texels): térreo (1,75) com a loja, andares em cima
  function drawFacade(g, e, w, h, o, K, th) {
    const { R, txt } = K;
    const wall = o.wall || WALLC[o.style] || '#1e293b';
    let s = o.seed * 977 + 3;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    if (o.style === 'house') return drawHouse(g, e, w, h, o, K, rnd);
    if (o.style === 'station') return drawStation(g, e, w, h, o, K, th);
    R(g, 0, 0, w, h, wall);
    // (tons da parede calculados uma vez: o laço das janelas roda centenas de vezes)
    const wD = sh(wall, -0.5);
    const wL = sh(wall, 0.3);
    const SHADE = new Map();
    const shd = (c, k) => SHADE.get(c + k) || (SHADE.set(c + k, sh(c, k)), SHADE.get(c + k));
    // textura da parede num ladrilho pequeno repetido (um fillRect só: antes eram milhares de
    // retangulinhos por prédio e a cidade demorava para montar)
    g.fillStyle = g.createPattern(wallTile(o.style, wall), 'repeat');
    g.fillRect(0, 0, w, h);
    const tall = o.style === 'tower' || o.style === 'tower2';
    // cornija no alto (as torres: a coroa acesa)
    R(g, 0, 0, w, 3, sh(wall, 0.25));
    R(g, 0, 3, w, 1, sh(wall, -0.45));
    if (tall) {
      R(g, 0, 0, w, 6, sh(wall, -0.3));
      R(g, 0, 2, w, 2, o.style === 'tower' ? '#7dd3fc' : '#fde68a');
      R(e, 0, 2, w, 2, '#fff');
    }
    const GF = Math.round(1.75 * FD); // altura do térreo
    const FH = Math.round((o.style === 'tower' ? 1.0 : 1.3) * FD); // altura de cada andar
    const glassy = o.style === 'glass' || o.style === 'tower';
    // andares: janelas acesas (morno, TV azulada) ou apagadas; varandas no seu prédio
    const top = tall ? 8 : 6;
    for (let fy = h - GF - FH; fy >= top; fy -= FH) {
      R(g, 0, fy + FH - 2, w, 2, sh(wall, glassy ? 0.2 : -0.3));
      if (o.style === 'home') R(g, 0, fy + FH - 3, w, 1, '#a8a29e');
      const step = glassy ? (o.style === 'tower' ? 8 : 12) : o.style === 'tower2' ? 16 : FD;
      const ww = glassy ? step - 2 : o.style === 'tower2' ? 10 : 12;
      // (andar inteiro de escritório aceso ou apagado nas torres)
      const floorLit = tall ? rnd() : 1;
      for (let x = Math.round(((w - 6) % step) / 2) + 3; x + ww <= w - 3; x += step) {
        if (o.gap && x + ww > o.gap[0] && x < o.gap[1] && fy > h - GF - FH * 1.2) continue;
        // (o outdoor cobre esses andares: nem desenha)
        if (o.adBox && fy + FH > o.adBox[1] && fy < o.adBox[3] && x + ww > o.adBox[0] && x < o.adBox[2]) continue;
        const r = rnd();
        const lit = tall ? r < (floorLit < 0.35 ? 0.15 : 0.62) : r < (glassy ? 0.45 : 0.55);
        const col = !lit ? (glassy ? '#0f172a' : '#1e293b') : tall ? (r < 0.12 ? '#e0f2fe' : r < 0.4 ? '#bae6fd' : '#fef3c7') : r < 0.1 ? '#93c5fd' : r < 0.32 ? '#fde68a' : '#fcd34d';
        const wy = fy + (o.style === 'tower' ? 3 : 5);
        const wh = o.style === 'tower' ? FH - 6 : glassy ? FH - 8 : 15;
        R(g, x - 1, wy - 1, ww + 2, wh + 2, wD);
        R(g, x, wy, ww, wh, col);
        if (lit) {
          R(e, x, wy, ww, wh, '#fff');
          // cortina, gente (silhueta) ou planta na janela
          const q = rnd();
          if (q < 0.3) R(g, x, wy, Math.round(ww / 3), wh, shd(col, -0.35));
          else if (q < 0.45 && !tall) {
            R(g, x + 4, wy + 6, 4, wh - 6, shd(col, -0.6));
            R(g, x + 5, wy + 3, 2, 3, shd(col, -0.6));
          }
        } else R(g, x + 1, wy + 1, 2, wh - 4, 'rgba(148,163,184,0.25)');
        if (!glassy) {
          R(g, x - 1, wy + wh + 1, ww + 2, 1, wL);
          R(g, x + ww / 2 - 0.5, wy, 1, wh, wD);
        }
        // ar-condicionado e varandas
        if (o.style === 'brick' && rnd() < 0.12) R(g, x + ww - 3, wy + wh + 2, 7, 4, '#cbd5e1');
        if (o.style === 'home') {
          R(g, x - 3, wy + wh - 4, ww + 6, 1, '#cbd5e1');
          for (let bx = x - 3; bx < x + ww + 3; bx += 3) R(g, bx, wy + wh - 4, 1, 5, '#94a3b8');
        }
      }
      // concreto das torres: colunas verticais entre as janelas
      if (o.style === 'tower2') for (let x = 0; x < w; x += 16) R(g, x, fy, 2, FH, sh(wall, 0.15));
    }
    // outdoor pendurado nos andares de cima (as torres)
    if (o.adBox) drawAd(g, e, o.adBox, o.ad, K, th);
    // térreo
    const gy = h - GF;
    R(g, 0, gy, w, 2, sh(wall, -0.5));
    R(g, 0, h - 3, w, 3, '#1c1917');
    if (o.style === 'home') {
      // o seu prédio: mármore escuro nos lados da entrada e a plaquinha do número
      R(g, 0, gy + 2, w, GF - 5, '#292524');
      for (let x = 0; x < w; x += 16) R(g, x, gy + 2, 1, GF - 5, '#44403c');
      txt(g, 'RESIDENCIAL AURORA', Math.round(w * 0.22), gy + 8, '#e7e5e4', 1);
      txt(g, 'N. 1200', Math.round(w * 0.82), gy + 8, '#d6d3d1', 1);
      R(g, Math.round(w * 0.82) - 12, gy + 14, 24, 1, th.acc);
      R(e, Math.round(w * 0.82) - 12, gy + 14, 24, 1, '#fff');
      return;
    }
    if (!o.shop) {
      // portaria de prédio (vidro escuro; nas torres o saguão aceso no meio)
      R(g, 0, gy + 2, w, GF - 5, sh(wall, -0.3));
      for (let x = 6; x + 14 < w; x += 22) {
        R(g, x, gy + 10, 14, GF - 18, '#0f172a');
        R(g, x + 1, gy + 11, 12, GF - 20, rnd() < 0.5 ? '#334155' : '#1e293b');
      }
      if (tall) {
        // saguão da torre: porta de vidro com o lustre aceso em cima (o resto à meia-luz)
        const dx = Math.round(w / 2 - 14);
        R(g, dx - 2, gy + 6, 32, GF - 9, '#0b0f1a');
        R(g, dx, gy + 8, 28, GF - 11, '#3b3424');
        R(g, dx + 4, gy + 10, 20, 3, '#fde68a');
        R(e, dx + 4, gy + 10, 20, 3, '#fff');
        R(g, dx, gy + GF - 12, 28, 6, '#57534e');
        R(g, dx + 13, gy + 14, 2, GF - 17, '#78716c');
        txt(g, 'TORRE', dx + 14, gy - 2, '#e7e5e4', 1);
      }
      return;
    }
    // loja: toldo listrado, placa acesa com o nome, vitrine iluminada e a porta
    const c = o.color;
    const doorX = o.doorLeft ? 6 : w - 22;
    R(g, 3, gy + 13, w - 6, GF - 16, '#0b0f1a');
    // vitrine
    const vx0 = o.doorLeft ? 26 : 6;
    const vx1 = o.doorLeft ? w - 6 : w - 26;
    R(g, vx0, gy + 15, vx1 - vx0, GF - 20, '#fef3c7');
    R(g, vx0, gy + 15, vx1 - vx0, GF - 20, 'rgba(251,191,36,0.25)');
    R(e, vx0, gy + 15, vx1 - vx0, GF - 20, '#fff');
    drawShopInside(g, e, vx0, gy + 15, vx1 - vx0, GF - 20, o, K, th);
    R(g, vx0, gy + 15, vx1 - vx0, 1, 'rgba(255,255,255,0.5)');
    for (let x = vx0 + 20; x < vx1 - 4; x += 22) R(g, x, gy + 15, 1, GF - 20, '#0b0f1a');
    // porta de vidro
    R(g, doorX, gy + 16, 16, GF - 19, '#1f2937');
    R(g, doorX + 1, gy + 17, 14, GF - 20, sh(c, -0.55));
    R(e, doorX + 1, gy + 17, 14, GF - 20, '#fff');
    R(g, doorX + 11, gy + 27, 2, 5, '#e5e7eb');
    // toldo
    for (let x = 1; x < w - 1; x += 6) {
      R(g, x, gy + 7, 3, 6, c);
      R(g, x + 3, gy + 7, 3, 6, '#f8fafc');
    }
    R(g, 1, gy + 12, w - 2, 1, sh(c, -0.4));
    // placa (a megaloja: placa grande na cor do clube)
    const name = o.shop;
    const big = o.mega && name.length * 8 + 9 < w ? 2 : 1;
    const tw = name.length * 4 * big + 7;
    const px = Math.round(w / 2 - tw / 2);
    const ph = big === 2 ? 15 : 10;
    R(g, px, gy - ph + 7, tw, ph, '#020617');
    R(g, px + 1, gy - ph + 8, tw - 2, ph - 2, sh(c, -0.55));
    txt(g, name, Math.round(w / 2), gy - ph + 10, c, big);
    txt(e, name, Math.round(w / 2), gy - ph + 10, '#fff', big);
    R(g, px + 1, gy - ph + 8, tw - 2, 1, c);
    R(e, px + 1, gy - ph + 8, tw - 2, 1, '#fff');
  }
  // casinhas do fundo do parque: 2 andares, telhado de duas águas (o céu aparece em volta)
  function drawHouse(g, e, w, h, o, K, rnd) {
    const { R } = K;
    const wall = o.color || '#fca5a5';
    const roofH = Math.round(Math.min(h * 0.32, w * 0.3));
    const body = h - roofH;
    R(g, 0, roofH, w, body, wall);
    g.fillStyle = g.createPattern(wallTile('house', wall), 'repeat');
    g.fillRect(0, roofH, w, body);
    // telhado (triângulo; o resto fica transparente)
    const rc = rnd() < 0.5 ? '#7f1d1d' : '#44403c';
    for (let y = 0; y < roofH; y++) {
      const hw = Math.round((w / 2 + 3) * ((y + 1) / roofH));
      R(g, Math.round(w / 2 - hw), y, hw * 2, 1, y % 3 === 0 ? sh(rc, -0.25) : rc);
    }
    R(g, 0, roofH, w, 2, sh(rc, -0.4));
    // chaminé
    R(g, Math.round(w * 0.7), Math.round(roofH * 0.25), 5, Math.round(roofH * 0.5), '#78716c');
    // janelas (2 andares) e a porta
    const fh = Math.round(body / 2);
    for (let f = 0; f < 2; f++) {
      const wy = roofH + 6 + f * fh;
      for (let x = 8; x + 12 < w - 4; x += 22) {
        if (f === 1 && Math.abs(x + 6 - w / 2) < 10) continue;
        const lit = rnd() < 0.6;
        R(g, x - 2, wy - 1, 16, 14, '#f8fafc');
        R(g, x, wy, 12, 11, lit ? '#fde68a' : '#334155');
        if (lit) R(e, x, wy, 12, 11, '#fff');
        R(g, x + 5, wy, 2, 11, '#f8fafc');
        R(g, x - 4, wy, 2, 11, sh(wall, -0.35));
        R(g, x + 14, wy, 2, 11, sh(wall, -0.35));
      }
    }
    const dx = Math.round(w / 2 - 6);
    R(g, dx, h - 22, 12, 20, '#78350f');
    R(g, dx + 9, h - 13, 2, 2, '#facc15');
    R(g, dx - 2, h - 24, 16, 2, '#f8fafc');
    R(g, 0, h - 2, w, 2, '#44403c');
  }
  // a estação central (fim da avenida): arco de entrada aceso, relógio e o nome
  function drawStation(g, e, w, h, o, K) {
    const { R, txt } = K;
    R(g, 0, 0, w, h, '#57534e');
    g.fillStyle = g.createPattern(wallTile('station', '#57534e'), 'repeat');
    g.fillRect(0, 0, w, h);
    R(g, 0, 0, w, 4, '#a8a29e');
    // colunas
    for (let x = 4; x < w; x += 26) R(g, x, 10, 6, h - 12, '#78716c');
    // janelas altas
    for (let x = 14; x + 14 < w; x += 26) {
      if (Math.abs(x + 7 - w / 2) < 34) continue;
      R(g, x, 26, 14, h - 60, '#1e293b');
      R(g, x + 1, 27, 12, h - 62, '#fde68a');
      R(e, x + 1, 27, 12, h - 62, '#fff');
      R(g, x + 6, 27, 1, h - 62, '#78716c');
      R(g, x + 1, 50, 12, 1, '#78716c');
    }
    // o arco da entrada
    const ax = Math.round(w / 2);
    const aw = 52;
    R(g, ax - aw / 2, h - 58, aw, 58, '#292524');
    for (let y = 0; y < 14; y++) {
      const hw = Math.round(Math.sqrt(1 - ((14 - y) / 14) ** 2) * (aw / 2 - 4));
      R(g, ax - hw, h - 54 + y, hw * 2, 1, '#fef3c7');
      R(e, ax - hw, h - 54 + y, hw * 2, 1, '#fff');
    }
    R(g, ax - aw / 2 + 4, h - 40, aw - 8, 38, '#fef3c7');
    R(e, ax - aw / 2 + 4, h - 40, aw - 8, 38, '#fff');
    // catracas e gente na porta (silhuetas)
    for (let x = ax - 20; x < ax + 20; x += 8) R(g, x, h - 16, 3, 13, '#78716c');
    R(g, ax - 14, h - 30, 3, 14, '#44403c');
    R(g, ax + 9, h - 28, 3, 12, '#44403c');
    // relógio e letreiro
    R(g, ax - 9, h - 100, 18, 18, '#f8fafc');
    R(g, ax - 8, h - 99, 16, 16, '#fef9c3');
    R(e, ax - 8, h - 99, 16, 16, '#fff');
    R(g, ax, h - 97, 1, 7, '#0f172a');
    R(g, ax, h - 91, 5, 1, '#0f172a');
    txt(g, 'ESTACAO CENTRAL', ax, h - 76, '#fef3c7', 2);
    txt(e, 'ESTACAO CENTRAL', ax, h - 76, '#fff', 2);
    txt(g, 'METRO - ONIBUS - TREM', ax, h - 64, '#e7e5e4', 1);
    R(g, 0, h - 3, w, 3, '#1c1917');
  }
  // o que aparece na vitrine de cada loja (pixel art pequena)
  function drawShopInside(g, e, x, y, w, h, o, K, th) {
    const { R, txt } = K;
    const k = o.shop;
    if (k === 'ESPORTES' || o.mega) {
      // a sua camisa do clube na vitrine, com o seu número (na megaloja: o escudo no meio)
      for (let i = 0; i < Math.floor(w / 18); i++) {
        const sx = x + 3 + i * 18;
        if (o.mega && Math.abs(sx + 7 - (x + w / 2)) < 16) continue;
        const mine = o.mega || i % 2 === 0;
        const c1 = mine ? (o.mega && i % 3 === 1 ? th.acc2 : th.acc) : '#e5e7eb';
        R(g, sx + 2, y + 3, 10, 12, c1);
        R(g, sx, y + 3, 3, 5, c1);
        R(g, sx + 11, y + 3, 3, 5, c1);
        R(g, sx + 5, y + 3, 4, 2, sh(c1, -0.4));
        if (mine) txt(g, String(prof().number || 10).slice(0, 2), sx + 7, y + 7, c1 === th.acc ? (th.acc2 === '#f8fafc' ? '#0f172a' : th.acc2) : th.acc, 1);
        R(g, sx + 6, y + 1, 2, 2, '#57534e');
      }
      if (o.mega) {
        // escudo do clube
        const cx = Math.round(x + w / 2);
        R(g, cx - 10, y + 1, 20, 22, '#020617');
        R(g, cx - 9, y + 2, 18, 16, th.acc);
        for (let i = 0; i < 5; i++) R(g, cx - 9 + i * 2, y + 18 + i, 18 - i * 4, 1, th.acc);
        R(g, cx - 3, y + 5, 6, 8, th.acc2);
        R(e, cx - 9, y + 2, 18, 1, '#fff');
      }
      R(g, x, y + h - 4, w, 4, '#78350f');
      return;
    }
    if (k === 'CINEMA' || k === 'TEATRO') {
      // cartaz e lâmpadas em volta
      for (let i = 0; i < Math.floor(w / 18); i++) {
        const sx = x + 2 + i * 18;
        R(g, sx, y + 2, 14, h - 4, i % 2 ? '#7c3aed' : '#0f172a');
        R(g, sx + 3, y + 6, 8, 8, i % 2 ? '#fde68a' : k === 'TEATRO' ? '#e11d48' : th.acc);
      }
      for (let bx = x; bx < x + w; bx += 4) {
        R(g, bx, y, 2, 2, '#fde68a');
        R(e, bx, y, 2, 2, '#fff');
      }
      return;
    }
    if (k === 'GOLACO LANCHES') {
      // balcão com hambúrguer, refri e a chapa
      R(g, x, y + h - 9, w, 9, '#b45309');
      R(g, x, y + h - 9, w, 1, '#fde68a');
      for (let sx = x + 4; sx < x + w - 10; sx += 14) {
        R(g, sx, y + h - 15, 9, 2, '#d97706');
        R(g, sx, y + h - 13, 9, 2, '#7c2d12');
        R(g, sx, y + h - 11, 9, 2, '#d97706');
        R(g, sx + 10, y + h - 17, 3, 8, '#dc2626');
      }
      // cardápio aceso
      R(g, x + 3, y + 2, w - 6, 7, '#0f172a');
      txt(g, 'X-GOL  X-CRAQUE', x + w / 2, y + 3, '#facc15', 1);
      return;
    }
    if (k === 'BARBEARIA') {
      // cadeiras de barbeiro e o espelho
      R(g, x + 2, y + 2, w - 4, 10, '#cbd5e1');
      R(g, x + 2, y + 2, w - 4, 1, '#f8fafc');
      for (let sx = x + 6; sx < x + w - 10; sx += 18) {
        R(g, sx, y + h - 14, 9, 7, '#7f1d1d');
        R(g, sx + 1, y + h - 20, 7, 6, '#991b1b');
        R(g, sx + 4, y + h - 7, 1, 6, '#94a3b8');
      }
      return;
    }
    if (k === 'ACADEMIA') {
      // esteiras
      for (let sx = x + 4; sx < x + w - 14; sx += 18) {
        R(g, sx, y + h - 6, 14, 3, '#334155');
        R(g, sx + 11, y + h - 16, 2, 10, '#334155');
        R(g, sx + 4, y + h - 15, 4, 9, '#0f172a');
      }
      return;
    }
    if (k === 'LAVANDERIA') {
      // máquinas de lavar
      for (let sx = x + 3; sx < x + w - 12; sx += 14) {
        R(g, sx, y + h - 16, 12, 14, '#e5e7eb');
        g.fillStyle = '#38bdf8';
        g.beginPath();
        g.arc(sx + 6, y + h - 9, 4, 0, Math.PI * 2);
        g.fill();
        R(g, sx + 2, y + h - 15, 4, 1, '#22c55e');
      }
      return;
    }
    if (k === 'GAMES' || k === 'CELULARES') {
      // telas acesas
      for (let sx = x + 3; sx < x + w - 12; sx += 15) {
        R(g, sx, y + 4, 12, 9, '#020617');
        R(g, sx + 1, y + 5, 10, 7, k === 'GAMES' ? ['#a855f7', '#22c55e', '#f43f5e'][(sx >> 3) % 3] : '#38bdf8');
        R(e, sx + 1, y + 5, 10, 7, '#fff');
      }
      R(g, x, y + h - 6, w, 6, '#1e293b');
      return;
    }
    if (k === 'RAMEN' || k === 'CANTINA' || k === 'CAFETERIA') {
      // lanternas penduradas e o balcão com tigelas
      for (let sx = x + 6; sx < x + w - 6; sx += 16) {
        R(g, sx, y + 2, 6, 7, k === 'RAMEN' ? '#ef4444' : '#fbbf24');
        R(e, sx, y + 2, 6, 7, '#fff');
      }
      R(g, x, y + h - 8, w, 8, '#78350f');
      for (let sx = x + 3; sx < x + w - 6; sx += 9) R(g, sx, y + h - 11, 6, 3, '#f8fafc');
      return;
    }
    // prateleiras com coisas coloridas (padaria, mercado, farmácia...)
    const pal = { PADARIA: ['#d97706', '#fbbf24', '#92400e'], FARMACIA: ['#f8fafc', '#22c55e', '#38bdf8'], CAFE: ['#78350f', '#f8fafc', '#a16207'], MERCADINHO: ['#22c55e', '#ef4444', '#facc15'], 'PET SHOP': ['#60a5fa', '#fbbf24', '#f472b6'], SORVETES: ['#f9a8d4', '#fde68a', '#a5f3fc'], PIZZARIA: ['#ef4444', '#facc15', '#78350f'], LIVRARIA: ['#1d4ed8', '#b91c1c', '#16a34a'], FLORES: ['#ec4899', '#facc15', '#22c55e'], RESTAURANTE: ['#f8fafc', '#dc2626', '#a16207'], HOTEL: ['#fbbf24', '#f8fafc', '#78350f'], ESCOLINHA: ['#22c55e', '#f8fafc', '#facc15'], KARAOKE: ['#ec4899', '#a855f7', '#38bdf8'], OTICA: ['#0f172a', '#a78bfa', '#e5e7eb'], BANCO: ['#38bdf8', '#e5e7eb', '#1e293b'] }[k] || ['#e5e7eb', '#94a3b8', '#facc15'];
    for (let r = 0; r < 2; r++) {
      const sy = y + 4 + r * Math.round(h / 2.4);
      R(g, x + 1, sy + 6, w - 2, 1, '#78350f');
      for (let sx = x + 2; sx < x + w - 4; sx += 4) {
        const c = pal[(sx + r) % 3];
        R(g, sx, sy + 2 + ((sx * 7) % 3), 3, 4 - ((sx * 7) % 3), c);
      }
    }
    if (k === 'FARMACIA') {
      // a cruz verde acesa
      R(g, x + w / 2 - 1, y + 2, 3, 9, '#22c55e');
      R(g, x + w / 2 - 4, y + 5, 9, 3, '#22c55e');
      R(e, x + w / 2 - 4, y + 2, 9, 9, '#fff');
    }
    if (k === 'ESCOLINHA') {
      // a bola desenhada na vitrine
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2);
      g.fill();
      R(g, x + w / 2 - 1, y + h / 2 - 1, 3, 3, '#0f172a');
    }
  }

  // o seu boneco recortado num retângulo (capa, telão, cartaz): cabeça e peito
  function drawMePortrait(g, x, y, w, h, th, K, scale = 1.8) {
    const P = PR();
    if (!P) return;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const s = Math.round(Math.min(w, h * 1.3) * scale);
    g.translate(Math.round(x + w / 2 - s / 2), Math.round(y - s * 0.06));
    g.imageSmoothingEnabled = false;
    try {
      P.drawCharacterSprite(g, meCd(th), s, s, { facing: 'front', view: 'front', frame: 1, animState: 'idle', shirtNumber: prof().number });
    } catch (err) {}
    g.restore();
  }
  // outdoors (propaganda inventada): b = [x0, y0, x1, y1] em texels
  function drawAd(g, e, b, kind, K, th) {
    const { R, txt } = K;
    const [x0, y0, x1, y1] = b;
    const w = x1 - x0;
    const h = y1 - y0;
    R(g, x0 - 2, y0 - 2, w + 4, h + 4, '#0b0f1a');
    if (kind === 'raio') {
      // chuteira RAIO: você com a chuteira dourada
      R(g, x0, y0, w, h, '#0f172a');
      g.fillStyle = '#facc15';
      g.beginPath();
      g.moveTo(x0 + w * 0.5, y0);
      g.lineTo(x0 + w * 0.62, y0);
      g.lineTo(x0 + w * 0.46, y0 + h);
      g.lineTo(x0 + w * 0.34, y0 + h);
      g.fill();
      drawMePortrait(g, x0 + 2, y0 + 2, Math.round(w * 0.48), h - 4, th, K, 1.5);
      const tx = x0 + Math.round(w * 0.76);
      txt(g, 'RAIO', tx, y0 + Math.round(h * 0.1), '#facc15', 3);
      txt(g, 'CHUTEIRAS', tx, y0 + Math.round(h * 0.34), '#f8fafc', 1);
      // chuteira
      const by = y0 + Math.round(h * 0.5);
      R(g, tx - 14, by, 26, 8, '#facc15');
      R(g, tx - 14, by + 8, 28, 3, '#1c1917');
      R(g, tx + 6, by - 4, 6, 4, '#facc15');
      txt(g, noAcc(meShirt()).slice(0, 10), tx, y0 + h - 20, '#f8fafc', 1);
      txt(g, 'USA. E VOCE?', tx, y0 + h - 12, '#fde68a', 1);
    } else if (kind === 'refri') {
      // refrigerante BOLHA (latinha e bolhas)
      R(g, x0, y0, w, h, '#0e7490');
      for (let i = 0; i < 14; i++) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.arc(x0 + ((i * 37) % w), y0 + ((i * 23) % h), 2 + (i % 3), 0, Math.PI * 2);
        g.fill();
      }
      const cx = x0 + Math.round(w * 0.26);
      R(g, cx - 10, y0 + 8, 20, h - 16, '#dc2626');
      R(g, cx - 10, y0 + 8, 20, 3, '#e5e7eb');
      R(g, cx - 10, y0 + h - 11, 20, 3, '#e5e7eb');
      R(g, cx - 6, y0 + 20, 4, h - 34, '#fca5a5');
      txt(g, 'BOLHA', x0 + Math.round(w * 0.66), y0 + Math.round(h * 0.25), '#f8fafc', 2);
      txt(g, 'GELADA DE VERDADE', x0 + Math.round(w * 0.66), y0 + Math.round(h * 0.6), '#cffafe', 1);
    } else if (kind === 'tv') {
      // o jogo de hoje na TV: o seu clube contra o rival
      R(g, x0, y0, w, h, '#1e1b4b');
      R(g, x0, y0 + h - 14, w, 14, '#312e81');
      txt(g, 'HOJE 20H', x0 + w / 2, y0 + 6, '#facc15', 2);
      txt(g, clubShort(), x0 + w / 2, y0 + 24, '#f8fafc', 1);
      txt(g, 'X', x0 + w / 2, y0 + 33, '#94a3b8', 1);
      txt(g, 'RIVAL', x0 + w / 2, y0 + 42, '#f8fafc', 1);
      txt(g, 'BLUE TV', x0 + w / 2, y0 + h - 10, '#a5b4fc', 1);
    } else {
      // você, gigante, na cor do clube
      R(g, x0, y0, w, h, sh(th.acc, -0.55));
      for (let y = y0; y < y1; y += 2) R(g, x0, y, w, 1, sh(th.acc, -0.62));
      g.fillStyle = sh(th.acc, -0.2);
      g.beginPath();
      g.moveTo(x0 + w * 0.42, y0);
      g.lineTo(x0 + w * 0.62, y0);
      g.lineTo(x0 + w * 0.5, y1);
      g.lineTo(x0 + w * 0.3, y1);
      g.fill();
      drawMePortrait(g, x0 + 3, y0 + 1, Math.round(w * 0.42), h - 2, th, K, 1.45);
      const nm = noAcc(meShirt()).slice(0, 12);
      const tx = x0 + Math.round(w * 0.72);
      txt(g, nm, tx, y0 + Math.round(h * 0.14), '#f8fafc', nm.length * 8 <= w * 0.5 ? 2 : 1);
      txt(g, '#' + (prof().number || 10), tx, y0 + Math.round(h * 0.36), th.acc2 === '#0f172a' || th.acc2 === '#0a0a0a' || th.acc2 === '#111827' ? '#f8fafc' : th.acc2, 3);
      txt(g, 'EGOISTA ATE O FIM', tx, y0 + Math.round(h * 0.68), '#facc15', 1);
      txt(g, clubShort(), tx, y0 + Math.round(h * 0.8), '#e2e8f0', 1);
    }
    // luzes do outdoor (acesas de noite)
    for (let x = x0; x < x1; x += 10) {
      R(g, x + 3, y0 - 4, 4, 2, '#fef9c3');
      R(e, x + 3, y0 - 4, 4, 2, '#fff');
    }
  }

  // ---------------------------------------------------------------- caixas (js/hub3d.js: buildBoxesGen)
  // volumes dos prédios para a sombra do sol de dia: [x0, y0, x1, y1, altura]
  let BLD = [];
  let HMAP = null;
  const SUNMAPS = {};
  // pedaço de uma textura (linhas y0..y1, colunas x0..x1)
  function crop(t, x0, y0, x1, y1) {
    const w = x1 - x0;
    const h = y1 - y0;
    const o = { w, h, px: new Uint32Array(w * h), em: t.em ? new Uint8Array(w * h) : null };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      o.px[y * w + x] = t.px[(y + y0) * t.w + x + x0];
      if (o.em) o.em[y * w + x] = t.em[(y + y0) * t.w + x + x0];
    }
    return o;
  }
  C.boxes = function* (th, K) {
    const { R, txt, makeTex, faceTex, WALL_H } = K;
    // (as caixas da cidade vão para o atlas do 3D no fim)
    const CB = [];
    const box = (x0, y0, x1, y1, z0, z1, spec, o) => {
      const b = K.box(x0, y0, x1, y1, z0, z1, spec, o);
      CB.push(b);
      return b;
    };
    BLD = [];
    HMAP = null;
    Object.keys(SUNMAPS).forEach((k) => delete SUNMAPS[k]);
    Object.keys(SUNJOB).forEach((k) => delete SUNJOB[k]);
    const flats = new Map();
    const flat = (c) => flats.get(c) || (flats.set(c, K.flat(c)), flats.get(c));
    const ftex = (lenT, hT, draw) => makeTex(Math.max(2, Math.round(lenT * FD)), Math.max(2, Math.round(hT * FD)), draw);
    // (as laterais lisas são uma textura só por cor, esticada na face, e as peças repetidas
    // dividem a mesma)
    const sides = new Map();
    const side = (c, edge) => {
      const k = c + (edge ? '|e' : '');
      if (!sides.has(k)) {
        sides.set(k, faceTex(1, 0.5, (g, e, w, h) => {
          R(g, 0, 0, w, h, c);
          R(g, 0, 0, w, 1, sh(c, 0.3));
          if (edge) R(g, 0, h - 2, w, 2, sh(c, -0.35));
        }));
      }
      return sides.get(k);
    };
    const once = new Map();
    const shared = (key, make) => once.get(key) || (once.set(key, make()), once.get(key));
    // vigas das portas novas, com o lugar para onde elas levam (como as do prédio)
    const lab = (s) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#020617');
      R(g, 1, 1, w - 2, h - 2, sh(th.wall, -0.3));
      R(g, 0, h - 2, w, 2, th.acc);
      R(e, 0, h - 2, w, 2, '#fff');
      txt(g, s, w / 2, Math.round(h / 2 - 3), '#f8fafc', 1);
      txt(e, s, w / 2, Math.round(h / 2 - 3), '#fff', 1);
    });
    box(DOOR_X, 30, DOOR_X + 1, 31, 1.46, WALL_H, { N: lab('PORTARIA'), S: lab('SEU APTO'), E: flat('#0f172a'), W: flat('#0f172a'), B: flat('#0f172a') }, { solid: false });
    box(DOOR_X, 35, DOOR_X + 1, 36, 1.46, WALL_H, { N: lab('RUA'), S: lab('ENTRADA'), E: flat('#0f172a'), W: flat('#0f172a'), B: flat('#0f172a') }, { solid: false });
    // portaria: balcão do porteiro e um banco
    box(14.3, 32.75, 14.78, 34.45, 0, 0.62, {
      side: side('#57534e', true),
      W: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#44403c');
        R(g, 0, 0, w, 3, '#d6d3d1');
        txt(g, 'PORTARIA', w / 2, 8, '#e7e5e4', 1);
      }),
      T: flat('#a8a29e')
    });
    box(11.06, 31.2, 11.4, 32.6, 0, 0.26, { side: side('#78350f', true), T: flat('#92400e') });
    yield;
    // ---- fachadas (uma caixa por prédio; só a frente tem a arte, o resto é liso)
    const dark = flat('#111827');
    const roof = flat('#0b0f1a');
    const front = (o, lenT, hT, seed) => ftex(lenT, hT, (g, e, w, h) => drawFacade(g, e, w, h, Object.assign({ seed }, o), K, th));
    NORTH.forEach(([x0, x1, hh, style, shop, color], i) => {
      BLD.push([x0, FN0 - 5, x1, FN1, hh]);
      if (style === 'home') {
        // o seu prédio: a entrada (x 12,55-14,45) fica aberta embaixo; marquise acesa por cima
        const gap = [Math.round((GAP0 - x0) * FD), Math.round((GAP1 - x0) * FD)];
        const tex = front({ style, gap }, x1 - x0, hh, 50 + i);
        // a mesma arte dividida em 3 caixas: esquerda, direita e o pedaço acima da entrada
        const part = (a, b, z0) => crop(tex, Math.round((a - x0) * FD), 0, Math.round((b - x0) * FD), Math.round((hh - z0) * FD));
        box(x0, FN0, GAP0, FN1, 0, hh, { S: part(x0, GAP0, 0), side: dark, T: roof });
        box(GAP1, FN0, x1, FN1, 0, hh, { S: part(GAP1, x1, 0), side: dark, T: roof });
        box(GAP0, FN0, GAP1, FN1, 2.1, hh, { S: part(GAP0, GAP1, 2.1), side: dark, T: roof, B: flat('#1c1917') }, { solid: false });
        // marquise da entrada (luzinhas embaixo) e o letreiro
        box(12.6, FN0, 14.4, 37.15, 1.92, 2.08, {
          side: flat('#1c1917'),
          S: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
            R(g, 0, 0, w, h, '#1c1917');
            R(g, 0, h - 1, w, 1, th.acc);
            R(e, 0, h - 1, w, 1, '#fff');
          }),
          T: flat('#292524'),
          // (o fundo da caixa é uma textura pronta, não uma função)
          B: faceTex(14.4 - 12.6, 37.15 - FN0, (g, e, w, h) => {
            R(g, 0, 0, w, h, '#292524');
            for (let x = 8; x < w; x += 18) for (let y = 8; y < h; y += 14) {
              R(g, x, y, 4, 4, '#fef3c7');
              R(e, x, y, 4, 4, '#fff');
            }
          })
        }, { solid: false });
        return;
      }
      box(x0, FN0, x1, FN1, 0, hh, { S: front({ style, shop, color, doorLeft: i % 2 === 0 }, x1 - x0, hh, i), side: dark, T: roof });
    });
    yield;
    // as outras fileiras de prédios (rua da vitória lado sul, avenida, calçadão, torres, casas)
    const sideDir = { N: 'S', S: 'N', W: 'E', E: 'W' };
    for (const row of ROWS) {
      for (let i = 0; i < row.list.length; i++) {
        const [a0, a1, hh, style, shop, color, ex] = row.list[i];
        const o = Object.assign({ style, shop, color, doorLeft: (i + row.seed) % 2 === 0 }, ex || {});
        if (o.mega) {
          o.shop = 'MEGALOJA ' + clubShort();
          o.color = th.acc;
        }
        if (style === 'house') o.wall = color;
        const len = a1 - a0;
        // outdoor nos andares de cima das torres
        if (o.ad) {
          const w = Math.round(len * FD);
          const aw = Math.round(w * 0.78);
          const ah = Math.round(aw * 0.46);
          const ax = Math.round((w - aw) / 2);
          // (logo acima da loja: dá para ver da calçada, sem ter que olhar para cima)
          const ay = Math.round(hh * FD) - Math.round(1.75 * FD) - ah - Math.round(FD * 0.35);
          o.adBox = [ax, ay, ax + aw, ay + ah];
        }
        const [p0, p1] = row.p;
        const S = (x0, y0, x1, y1, z0, z1, spec, opt) => (row.side === 'N' || row.side === 'S' ? box(x0, y0, x1, y1, z0, z1, spec, opt) : box(y0, x0, y1, x1, z0, z1, spec, opt));
        const fd = sideDir[row.side];
        if (style === 'house') {
          // casinha: o corpo (caixa) e o telhado de duas águas (só a frente, com o céu em volta)
          const tex = front(o, len, hh, row.seed + i);
          const roofH = Math.round(Math.min(tex.h * 0.32, tex.w * 0.3));
          const zr = hh - roofH / FD;
          S(a0, p0, a1, p1, 0, zr, { [fd]: crop(tex, 0, roofH, tex.w, tex.h), side: flat(sh(color, -0.25)), T: flat('#57534e') });
          S(a0, p0, a1, p1, zr, hh, { [fd]: crop(tex, 0, 0, tex.w, roofH) }, { solid: false });
        } else {
          S(a0, p0, a1, p1, 0, hh, { [fd]: front(o, len, hh, row.seed + i), side: dark, T: roof });
        }
        // o volume para a sombra (entra no quarteirão)
        const d = row.deep;
        if (row.side === 'N') BLD.push([a0, p0 - d, a1, p1, hh]);
        else if (row.side === 'S') BLD.push([a0, p0, a1, p1 + d, hh]);
        else if (row.side === 'W') BLD.push([p0 - d, a0, p1, a1, hh]);
        else BLD.push([p0, a0, p1 + d, a1, hh]);
        if (hh > 8 || o.ad) yield; // (as torres demoram mais: uma por fatia)
      }
      yield;
    }
    // as pontas das ruas: prédios fechando a rua da vitória (oeste e atrás do telão), o
    // calçadão (oeste) e a rua das torres (leste, com o jogo de hoje na TV)
    const cap = (x0, y0, x1, y1, hh, dir, o, seed) => {
      const len = dir === 'E' || dir === 'W' ? y1 - y0 : x1 - x0;
      box(x0, y0, x1, y1, 0, hh, { [dir]: front(o, len, hh, seed), side: dark, T: roof });
      BLD.push([x0, y0, x1, y1, hh]);
    };
    cap(1.0, FN0, 1.6, FS1, 6.0, 'E', { style: 'stucco' }, 40);
    cap(60.4, FN0, 60.98, FS1, 6.6, 'W', { style: 'brick' }, 41);
    cap(1.0, R2.f1, 1.6, FENCE_Y, 5.2, 'E', { style: 'stucco', wall: '#9a8a74' }, 42);
    yield;
    {
      const len = R2.s0 - R2.f1;
      const w = Math.round(len * FD);
      const aw = Math.round(w * 0.7);
      const ah = Math.round(aw * 0.55);
      cap(60.4, R2.f1, 60.98, R2.s0, 7.2, 'W', { style: 'brick', ad: 'raio', adBox: [Math.round((w - aw) / 2), Math.round(FD * 1.2), Math.round((w + aw) / 2), Math.round(FD * 1.2) + ah] }, 43);
    }
    yield;
    // a estação central (fim da avenida) e o outdoor gigante com você em cima
    box(25.0, AV.y1, 36.0, 78.98, 0, 6.0, { N: front({ style: 'station' }, 11.0, 6.0, 44), side: dark, T: roof });
    BLD.push([25.0, AV.y1, 36.0, 78.98, 6.0]);
    const poleC = flat('#1f2937');
    [27.0, 34.0].forEach((x) => box(x - 0.08, 78.6, x + 0.08, 78.76, 6.0, 6.6, { side: poleC }, { solid: false }));
    box(26.0, 78.55, 35.0, 78.8, 6.6, 10.6, {
      side: flat('#0b0f1a'),
      T: flat('#0b0f1a'),
      B: flat('#0b0f1a'),
      // (aceso de dia também: keepDay)
      N: Object.assign(faceTex(9.0, 4.0, (g, e, w, h) => {
        drawAd(g, e, [4, 6, w - 4, h - 4], 'me', K, th);
        R(e, 4, 6, w - 8, h - 10, '#fff');
      }), { keepDay: true })
    }, { solid: false });
    yield;
    // ---- carros parados (texturas por cor: os da mesma cor dividem)
    const carTex = new Map();
    const carFaces = (col) => {
      if (carTex.has(col)) return carTex.get(col);
      const L = 1.9;
      const body = {
        side: faceTex(L, 0.5, (g, e, w, h) => {
          R(g, 0, 0, w, h, col);
          R(g, 0, 0, w, 2, sh(col, 0.35));
          R(g, 0, h - 6, w, 6, sh(col, -0.45));
          R(g, Math.round(w * 0.5), 3, 1, h - 9, sh(col, -0.4));
          R(g, Math.round(w * 0.47), 6, 4, 1, '#e5e7eb');
          [0.2, 0.8].forEach((k) => {
            const cx = Math.round(w * k);
            R(g, cx - 8, h - 12, 16, 12, '#0b0f1a');
            R(g, cx - 6, h - 10, 12, 10, '#111827');
            R(g, cx - 3, h - 7, 6, 5, '#94a3b8');
          });
        }),
        frontF: faceTex(0.85, 0.5, (g, e, w, h) => {
          R(g, 0, 0, w, h, col);
          R(g, 0, 0, w, 2, sh(col, 0.35));
          R(g, 3, 6, 7, 4, '#fef9c3');
          R(g, w - 10, 6, 7, 4, '#fef9c3');
          R(e, 3, 6, 7, 4, '#fff');
          R(e, w - 10, 6, 7, 4, '#fff');
          R(g, 11, 12, w - 22, 4, '#1f2937');
          R(g, 0, h - 5, w, 5, sh(col, -0.5));
        }),
        backF: faceTex(0.85, 0.5, (g, e, w, h) => {
          R(g, 0, 0, w, h, col);
          R(g, 0, 0, w, 2, sh(col, 0.35));
          R(g, 2, 6, 8, 4, '#dc2626');
          R(g, w - 10, 6, 8, 4, '#dc2626');
          R(e, 2, 6, 8, 4, '#fff');
          R(e, w - 10, 6, 8, 4, '#fff');
          R(g, w / 2 - 6, 11, 12, 4, '#f8fafc');
          R(g, 0, h - 5, w, 5, sh(col, -0.5));
        }),
        top: faceTex(L, 0.85, (g, e, w, h) => {
          R(g, 0, 0, w, h, col);
          R(g, 0, 0, w, 1, sh(col, 0.3));
        }),
        // (a cabine é quase só vidro: a mesma para todas as cores)
        cabSide: shared('cabSide', () => faceTex(1.2, 0.36, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#111827');
          R(g, 4, 3, Math.round(w / 2) - 6, h - 4, '#1e293b');
          R(g, Math.round(w / 2) + 2, 3, Math.round(w / 2) - 6, h - 4, '#1e293b');
          R(g, 6, 4, 6, 1, 'rgba(255,255,255,0.35)');
        })),
        cabEnd: shared('cabEnd', () => faceTex(0.73, 0.36, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#111827');
          R(g, 3, 2, w - 6, h - 3, '#1e293b');
          R(g, 5, 3, 8, 1, 'rgba(255,255,255,0.35)');
        })),
        cabTop: flat(sh(col, 0.08))
      };
      carTex.set(col, body);
      return body;
    };
    CARS.forEach(([x0, y0, dir, col]) => {
      const f = carFaces(col);
      const L = 1.9;
      const W = 0.85;
      if (dir === 'E' || dir === 'W') {
        const x1 = x0 + L;
        const y1 = y0 + W;
        const east = dir === 'E';
        box(x0, y0, x1, y1, 0.04, 0.54, { N: f.side, S: f.side, E: east ? f.frontF : f.backF, W: east ? f.backF : f.frontF, T: f.top });
        box(x0 + 0.38, y0 + 0.06, x1 - 0.32, y1 - 0.06, 0.54, 0.9, { N: f.cabSide, S: f.cabSide, E: f.cabEnd, W: f.cabEnd, T: f.cabTop });
      } else {
        const x1 = x0 + W;
        const y1 = y0 + L;
        const south = dir === 'S';
        box(x0, y0, x1, y1, 0.04, 0.54, { E: f.side, W: f.side, S: south ? f.frontF : f.backF, N: south ? f.backF : f.frontF, T: f.top });
        box(x0 + 0.06, y0 + (south ? 0.38 : 0.32), x1 - 0.06, y1 - (south ? 0.32 : 0.38), 0.54, 0.9, { E: f.cabSide, W: f.cabSide, N: f.cabEnd, S: f.cabEnd, T: f.cabTop });
      }
    });
    // o ônibus parado no ponto da avenida (subindo, portas para a calçada)
    {
      const bc = '#15803d';
      const busSide = (doors) => faceTex(4.0, 1.4, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#e5e7eb');
        R(g, 0, h - 26, w, 10, bc);
        R(g, 0, 0, w, 3, '#f8fafc');
        for (let x = 10; x < w - 14; x += 22) {
          R(g, x, 10, 18, 18, '#0f172a');
          R(g, x + 1, 11, 16, 16, '#1e3a5f');
          R(g, x + 2, 12, 5, 1, 'rgba(255,255,255,0.35)');
        }
        if (doors) [16, w - 40].forEach((x) => {
          R(g, x, 8, 22, h - 14, '#0f172a');
          R(g, x + 11, 8, 1, h - 14, '#475569');
        });
        [0.18, 0.8].forEach((k) => {
          const cx = Math.round(w * k);
          R(g, cx - 9, h - 14, 18, 14, '#0b0f1a');
          R(g, cx - 4, h - 9, 8, 7, '#94a3b8');
        });
      });
      const busEnd = (frontF) => faceTex(1.0, 1.4, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#e5e7eb');
        R(g, 0, h - 26, w, 10, bc);
        if (frontF) {
          R(g, 3, 4, w - 6, 9, '#020617');
          txt(g, 'ESTADIO', w / 2, 6, '#fb923c', 1);
          txt(e, 'ESTADIO', w / 2, 6, '#fff', 1);
          R(g, 3, 15, w - 6, 20, '#1e3a5f');
          R(g, 4, h - 12, 7, 4, '#fef9c3');
          R(g, w - 11, h - 12, 7, 4, '#fef9c3');
          R(e, 4, h - 12, 7, 4, '#fff');
          R(e, w - 11, h - 12, 7, 4, '#fff');
        } else {
          R(g, 5, 8, w - 10, 14, '#1e3a5f');
          R(g, 4, h - 12, 7, 4, '#dc2626');
          R(g, w - 11, h - 12, 7, 4, '#dc2626');
        }
      });
      box(AV.ce - 1.05, 46.2, AV.ce - 0.08, 50.2, 0.1, 1.5, { E: busSide(true), W: busSide(false), N: busEnd(true), S: busEnd(false), T: flat('#cbd5e1') });
    }
    yield;
    // ---- postes (luz morna embaixo da cabeça), postes de praça e semáforos
    const lampB = faceTex(0.5, 0.22, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#fef3c7');
      R(e, 0, 0, w, h, '#fff');
    });
    const head = flat('#111827');
    const post = (x, y, dir) => {
      box(x - 0.05, y - 0.05, x + 0.05, y + 0.05, 0, 2.62, { side: poleC, T: poleC });
      const ns = Math.abs(dir) === 1;
      const ax = ns ? x : x + Math.sign(dir) * 0.5;
      const ay = ns ? y + dir * 0.5 : y;
      box(Math.min(x, ax) - 0.04, Math.min(y, ay) - 0.04, Math.max(x, ax) + 0.04, Math.max(y, ay) + 0.04, 2.55, 2.62, { side: poleC, T: poleC }, { solid: false });
      if (ns) box(ax - 0.25, ay - 0.11, ax + 0.25, ay + 0.11, 2.47, 2.6, { side: head, T: head, B: lampB }, { solid: false });
      else box(ax - 0.11, ay - 0.25, ax + 0.11, ay + 0.25, 2.47, 2.6, { side: head, T: head, B: lampB }, { solid: false });
    };
    POSTS.forEach(([x, y, d]) => post(x, y, d));
    // postes duplos no canteiro da avenida
    MPOSTS.forEach((y) => {
      const x = (AV.m0 + AV.m1) / 2;
      box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, 2.9, { side: poleC, T: poleC });
      box(x - 0.62, y - 0.04, x + 0.62, y + 0.04, 2.82, 2.9, { side: poleC, T: poleC }, { solid: false });
      [-0.62, 0.62].forEach((dx) => box(x + dx - 0.25, y - 0.11, x + dx + 0.25, y + 0.11, 2.75, 2.88, { side: head, T: head, B: lampB }, { solid: false }));
    });
    // postes de praça (globo aceso em cima)
    const globe = shared('globo', () => faceTex(0.3, 0.3, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#fef3c7');
      R(g, 0, 0, w, 2, '#f8fafc');
      R(e, 0, 0, w, h, '#fff');
    }));
    GLOBES.forEach(([x, y]) => {
      box(x - 0.045, y - 0.045, x + 0.045, y + 0.045, 0, 2.2, { side: poleC, T: poleC });
      box(x - 0.15, y - 0.15, x + 0.15, y + 0.15, 2.2, 2.5, { side: globe, T: globe }, { solid: false });
      box(x - 0.18, y - 0.18, x + 0.18, y + 0.18, 2.5, 2.55, { side: poleC, T: poleC }, { solid: false });
    });
    const sem = (x, y, face) => {
      box(x - 0.04, y - 0.04, x + 0.04, y + 0.04, 0, 2.05, { side: poleC, T: poleC });
      const hd = shared('semaforo', () => faceTex(0.22, 0.58, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#0b0f1a');
        [['#dc2626', 1], ['#78350f', 0], ['#14532d', 0]].forEach(([c, on], i) => {
          R(g, 2, 2 + i * 7, w - 4, 5, c);
          if (on) R(e, 2, 2 + i * 7, w - 4, 5, '#fff');
        });
      }));
      const ped = shared('semPedestre', () => faceTex(0.22, 0.3, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#0b0f1a');
        R(g, 3, 3, w - 6, h - 6, '#22c55e');
        R(e, 3, 3, w - 6, h - 6, '#fff');
        R(g, 4, 4, 1, 3, '#052e16');
      }));
      const pf = face === 'E' || face === 'W' ? { N: ped, S: ped } : { E: ped, W: ped };
      box(x - 0.11, y - 0.09, x + 0.11, y + 0.09, 1.95, 2.53, { side: flat('#0b0f1a'), [face]: hd, T: flat('#0b0f1a') }, { solid: false });
      box(x - 0.11, y - 0.09, x + 0.11, y + 0.09, 1.45, 1.75, Object.assign({ side: flat('#0b0f1a') }, pf), { solid: false });
    };
    sem(21.9, CURB_S + 0.22, 'W');
    sem(38.9, CURB_N - 0.22, 'E');
    sem(AV.cw - 0.22, CURB_S + 0.22, 'N');
    sem(AV.ce + 0.22, CURB_S + 0.22, 'N');
    sem(AV.cw - 0.22, 53.15, 'N');
    sem(AV.ce + 0.22, 53.15, 'N');
    sem(AV.cw - 0.22, 65.9, 'S');
    sem(AV.ce + 0.22, 65.9, 'S');
    sem(AV.ce + 0.22, R2.cn - 0.22, 'E');
    sem(AV.ce + 0.22, R2.cs + 0.22, 'E');
    yield;
    // ---- banca de jornal (verde, com você na capa)
    const B = BANCA;
    box(B.x0, B.y0, B.x1, B.y1, 0, 1.45, {
      side: side('#166534', true),
      T: flat('#14532d'),
      N: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#14532d');
        R(g, 0, 0, w, 3, '#22c55e');
        // revistas penduradas (a do meio é você)
        R(g, 2, 5, w - 4, h - 16, '#0f2a1a');
        // (só a faixa de luz de cima brilha: a capa fica nítida, iluminada pela lâmpada da banca)
        R(e, 0, 0, w, 3, '#fff');
        const covers = ['#dc2626', '#1d4ed8', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#16a34a', '#facc15'];
        for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
          const cx = 4 + i * 14;
          const cy = 7 + r * 20;
          if (cx + 12 > w - 4) continue;
          if (r === 0 && (i === 2 || i === 3)) continue;
          R(g, cx, cy, 12, 17, covers[(i + r * 3) % covers.length]);
          R(g, cx + 1, cy + 1, 10, 3, '#f8fafc');
          R(g, cx + 2, cy + 7, 8, 6, sh(covers[(i + r * 3) % covers.length], -0.35));
        }
        // a capa grande: o seu rosto e o seu nome
        const mx = 30;
        const mw = 26;
        R(g, mx - 1, 5, mw + 2, 36, '#020617');
        R(g, mx, 6, mw, 34, th.acc);
        drawMePortrait(g, mx, 12, mw, 28, th, K, 2.0);
        R(g, mx, 6, mw, 7, '#020617');
        txt(g, noAcc(meShirt()).slice(0, 6), mx + mw / 2, 7, '#facc15', 1);
        R(g, 0, h - 10, w, 10, '#052e16');
        txt(g, 'BANCA', w / 2, h - 8, '#bbf7d0', 1);
        txt(e, 'BANCA', w / 2, h - 8, '#fff', 1);
      })
    });
    // cobertura da banca
    box(B.x0 - 0.12, B.y0 - 0.32, B.x1 + 0.12, B.y1 + 0.05, 1.45, 1.56, { side: flat('#166534'), T: flat('#14532d'), B: flat('#0f2a1a') }, { solid: false });
    // ---- abrigo do ônibus na avenida (virado para o oeste): painel com o cartaz do clube (você)
    {
      const xb = AV.e0 - 0.08;
      box(xb - 0.14, BUS.y0, xb, BUS.y1, 0, 1.95, {
        side: flat('#334155'),
        W: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#1e293b');
          const px = Math.round(w * 0.55);
          const pw = Math.round(w * 0.4);
          R(g, px, 8, pw, h - 22, '#020617');
          R(g, px + 1, 9, pw - 2, h - 24, th.acc2);
          drawMePortrait(g, px + 1, 14, pw - 2, h - 30, th, K, 1.6);
          R(g, px + 1, h - 22, pw - 2, 8, '#020617');
          txt(g, clubShort().slice(0, 9), px + pw / 2, h - 20, th.acc, 1);
          R(e, px, 8, pw, 1, '#fff');
          R(e, px + 1, h - 22, pw - 2, 8, '#fff');
          // vidro do resto do painel e o mapa das linhas
          R(g, 4, 10, px - 10, h - 30, '#0f172a');
          R(g, 8, 16, 26, 18, '#e2e8f0');
          R(g, 10, 20, 22, 1, '#ef4444');
          R(g, 10, 26, 18, 1, '#2563eb');
          R(g, 10, 30, 14, 1, '#16a34a');
          R(g, 0, h - 6, w, 6, '#0f172a');
        })
      });
      box(xb - 0.55, BUS.y0 + 0.2, xb - 0.15, BUS.y1 - 0.2, 0, 0.42, { side: side('#64748b', true), T: flat('#94a3b8') });
      box(xb - 1.05, BUS.y0 - 0.1, xb + 0.02, BUS.y1 + 0.1, 1.95, 2.04, { side: flat('#334155'), T: flat('#475569'), B: flat('#1e293b') }, { solid: false });
      // placa do ponto
      box(AV.ce + 0.3, BUS.y1 + 0.35, AV.ce + 0.38, BUS.y1 + 0.43, 0, 2.1, { side: poleC });
      box(AV.ce + 0.3, BUS.y1 + 0.27, AV.ce + 0.38, BUS.y1 + 0.51, 1.8, 2.14, {
        side: flat('#1d4ed8'),
        W: faceTex(0.24, 0.34, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#1d4ed8');
          R(g, 2, 2, w - 4, h - 4, '#f8fafc');
          R(g, 3, 4, w - 6, 3, '#1d4ed8');
        })
      }, { solid: false });
    }
    yield;
    // ---- fim do asfalto da rua da vitória: frades (os pedestres passam, os carros não)
    for (let y = CURB_N + 0.3; y < CURB_S - 0.2; y += 0.62) {
      box(STREET_X1 - 0.07, y - 0.07, STREET_X1 + 0.07, y + 0.07, 0, 0.55, {
        side: shared('frade', () => faceTex(0.14, 0.55, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#9ca3af');
          R(g, 0, 3, w, 2, '#facc15');
        })),
        T: flat('#d1d5db')
      });
    }
    // ---- a praça: quadra cercada (alambrado com entrada a oeste), golzinhos e refletores
    const net = shared('rede', () => faceTex(0.8, 0.8, (g, e, w, h) => {
      for (let x = 0; x < w; x += 5) R(g, x, 0, 1, h, '#94a3b8');
      for (let y = 0; y < h; y += 5) R(g, 0, y, w, 1, '#94a3b8');
    }));
    const Q = COURT;
    const FH = 2.0;
    // alambrado: tela de arame (losangos) escura e vazada, uma textura por comprimento
    const FENCE = new Map();
    const fenceNet = (lenT, hT) => {
      const k = lenT.toFixed(2) + 'x' + hT.toFixed(2);
      if (FENCE.has(k)) return FENCE.get(k);
      const t = makeTex(Math.max(4, Math.round(lenT * 20)), Math.max(4, Math.round(hT * 20)), (g, e, w, h) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const a = (x + y) % 6;
          const b = (x - y + 600) % 6;
          if (a === 0 || b === 0) R(g, x, y, 1, 1, '#1f2937');
        }
        R(g, 0, 0, w, 2, '#64748b');
        R(g, 0, h - 2, w, 2, '#334155');
      });
      FENCE.set(k, t);
      return t;
    };
    const fence = (x0, y0, x1, y1) => {
      const ns = x1 - x0 > y1 - y0;
      const L = ns ? x1 - x0 : y1 - y0;
      const tex = fenceNet(L, FH);
      const end = flat('#475569');
      box(x0, y0, x1, y1, 0, FH, ns ? { N: tex, S: tex, E: end, W: end, T: flat('#94a3b8') } : { E: tex, W: tex, N: end, S: end, T: flat('#94a3b8') });
    };
    fence(Q.x0, Q.y0 - 0.03, Q.x1, Q.y0 + 0.03);
    fence(Q.x0, Q.y1 - 0.03, Q.x1, Q.y1 + 0.03);
    fence(Q.x1 - 0.03, Q.y0, Q.x1 + 0.03, Q.y1);
    fence(Q.x0 - 0.03, Q.y0, Q.x0 + 0.03, 39.25);
    fence(Q.x0 - 0.03, 40.75, Q.x0 + 0.03, Q.y1);
    for (let x = Q.x0; x <= Q.x1 + 0.01; x += 2.5) {
      box(x - 0.05, Q.y0 - 0.05, x + 0.05, Q.y0 + 0.05, 0, FH + 0.05, { side: poleC });
      box(x - 0.05, Q.y1 - 0.05, x + 0.05, Q.y1 + 0.05, 0, FH + 0.05, { side: poleC });
    }
    const white = flat('#f1f5f9');
    [[Q.x0 + 0.35, 1], [Q.x1 - 0.35, -1]].forEach(([gx, d]) => {
      const back = gx - d * 0.45;
      box(gx - 0.04, 39.4, gx + 0.04, 39.48, 0, 0.8, { side: white });
      box(gx - 0.04, 40.52, gx + 0.04, 40.6, 0, 0.8, { side: white });
      box(gx - 0.04, 39.4, gx + 0.04, 40.6, 0.76, 0.84, { side: white, T: white }, { solid: false });
      box(Math.min(gx, back), 39.4, Math.max(gx, back), 39.43, 0, 0.8, { side: net });
      box(Math.min(gx, back), 40.57, Math.max(gx, back), 40.6, 0, 0.8, { side: net });
      box(back - 0.02, 39.4, back + 0.02, 40.6, 0, 0.8, { side: net });
    });
    // bancos de madeira (praça, calçadão e parque)
    BENCHES.forEach(([x0, y0, x1, y1]) => box(x0, y0, x1, y1, 0, 0.4, { side: side('#78350f', true), T: flat('#92400e') }));
    // refletores da quadra (em postes altos nos cantos)
    [[45.9, 36.65], [58.5, 43.8]].forEach(([x, y]) => {
      box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, 4.0, { side: poleC });
      box(x - 0.35, y - 0.12, x + 0.35, y + 0.12, 3.85, 4.15, { side: head, T: head, B: lampB }, { solid: false });
    });
    yield;
    // ---- o telão com você (no fim da rua, virado para quem sai do prédio)
    const T = BOARD;
    box(T.x0 + 0.06, 38.3, T.x0 + 0.18, 38.42, 0, T.z0, { side: poleC });
    box(T.x0 + 0.06, 41.58, T.x0 + 0.18, 41.7, 0, T.z0, { side: poleC });
    box(T.x0, T.y0, T.x1, T.y1, T.z0, T.z1, {
      side: flat('#0b0f1a'),
      T: flat('#0b0f1a'),
      B: flat('#0b0f1a'),
      // (o telão fica aceso de dia também: keepDay)
      W: Object.assign(faceTex(T.y1 - T.y0, T.z1 - T.z0, (g, e, w, h) => drawBoard(g, e, w, h, th, K)), { keepDay: true })
    }, { solid: false });
    // ---- avenida: canteiro do meio (grama e meio-fio)
    const grassTop = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#3f7d32');
      for (let i = 0; i < w * h * 0.06; i++) {
        const x = (i * 37 + (i >> 3) * 11) % w;
        const y = (i * 53 + (i >> 2) * 7) % h;
        R(g, x, y, 1, 1, i % 9 === 0 ? '#facc15' : i % 3 ? '#2f6b24' : '#4d9a3c');
      }
      R(g, 0, 0, w, 2, '#a8a29e');
      R(g, 0, h - 2, w, 2, '#a8a29e');
      R(g, 0, 0, 2, h, '#a8a29e');
      R(g, w - 2, 0, 2, h, '#a8a29e');
    });
    const curbSide = side('#9ca3af', true);
    MEDIAN.forEach(([y0, y1]) => box(AV.m0, y0, AV.m1, y1, 0, 0.22, { side: curbSide, T: grassTop }));
    yield;
    // ---- metrô: pavilhão de vidro com a escada rolante descendo e o totem com o M
    const mDoor = (name) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#0f172a');
      // letreiro
      R(g, 0, 0, w, 12, '#1d4ed8');
      R(e, 0, 0, w, 12, '#fff');
      txt(g, name, w / 2, 4, '#f8fafc', 1);
      // a escada descendo para o escuro (degraus cada vez mais escuros)
      const x0 = 8;
      const x1 = w - 8;
      for (let i = 0; i < 12; i++) {
        const y = 22 + i * Math.round((h - 26) / 12);
        const k = 0.25 + (i / 11) * 0.75;
        const c = `rgb(${Math.round(160 * k)},${Math.round(170 * k)},${Math.round(184 * k)})`;
        R(g, x0 + i, y, x1 - x0 - i * 2, Math.round((h - 26) / 12) - 1, c);
      }
      R(g, x0 - 3, 18, 3, h - 18, '#94a3b8');
      R(g, x1, 18, 3, h - 18, '#94a3b8');
      R(e, x0 - 3, 18, 1, h - 18, '#fff');
      R(e, x1 + 2, 18, 1, h - 18, '#fff');
    });
    const mGlass = shared('metroVidro', () => faceTex(1.6, 2.3, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#0f172a');
      R(g, 2, 12, w - 4, h - 16, '#1e3a5f');
      for (let x = 2; x < w; x += 16) R(g, x, 12, 2, h - 14, '#334155');
      R(g, 0, 0, w, 12, '#1d4ed8');
      R(e, 0, 0, w, 12, '#fff');
      // o mapa das linhas
      R(g, 8, 30, 30, 22, '#e2e8f0');
      R(g, 10, 36, 26, 2, '#2563eb');
      R(g, 10, 44, 20, 2, '#ef4444');
      R(g, 22, 32, 2, 18, '#16a34a');
      for (let i = 0; i < 3; i++) R(g, 6 + i * 22, 14, 10, 1, 'rgba(255,255,255,0.3)');
    }));
    const mLogo = shared('metroLogo', () => faceTex(0.44, 0.44, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#1d4ed8');
      R(g, 1, 1, w - 2, h - 2, '#2563eb');
      txt(g, 'M', w / 2, h / 2 - 5, '#f8fafc', 2);
      R(e, 0, 0, w, h, '#fff');
    }));
    METRO.forEach((m) => {
      box(m.x0, m.y0, m.x1, m.y1, 0, 2.3, { [m.face]: mDoor(m.name), side: mGlass, T: flat('#1e293b') });
      box(m.x0 - 0.06, m.y0 - 0.06, m.x1 + 0.06, m.y1 + 0.06, 2.3, 2.4, { side: flat('#1d4ed8'), T: flat('#334155') }, { solid: false });
      // totem
      const tx = m.face === 'E' ? m.x0 + 0.3 : m.x0 - 0.25;
      const ty = m.face === 'E' ? m.y0 - 0.25 : m.y0 - 0.2;
      box(tx - 0.05, ty - 0.05, tx + 0.05, ty + 0.05, 0, 2.5, { side: poleC });
      box(tx - 0.22, ty - 0.22, tx + 0.22, ty + 0.22, 2.5, 2.94, { side: mLogo, T: flat('#1d4ed8') }, { solid: false });
      BLD.push([m.x0, m.y0, m.x1, m.y1, 2.4]);
    });
    yield;
    // ---- calçadão: canteiros, lanchonete, mesas da cantina, carrinho de pipoca, mercadinho, barbearia
    const soil = shared('terra', () => faceTex(0.9, 0.9, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#3f2a1d');
      for (let i = 0; i < 40; i++) R(g, (i * 13) % w, (i * 29) % h, 2, 1, i % 2 ? '#2a1a10' : '#5b3a26');
      R(g, 0, 0, w, 3, '#a8a29e');
      R(g, 0, h - 3, w, 3, '#a8a29e');
      R(g, 0, 0, 3, h, '#a8a29e');
      R(g, w - 3, 0, 3, h, '#a8a29e');
    }));
    TREES.forEach(([x, y]) => {
      if (y > R2.b0 - 0.2 && y < R2.b1 + 0.2 && x < 25) box(x - 0.45, y - 0.45, x + 0.45, y + 0.45, 0, 0.38, { side: side('#a8a29e', true), T: soil });
    });
    // lanchonete: balcão na calçada com o cardápio e banquinhos
    const L0 = LANCHE;
    box(L0.x0, L0.y0, L0.x1, L0.y1, 0, 0.62, {
      side: side('#b45309', true),
      S: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#92400e');
        R(g, 0, 0, w, 4, '#fde68a');
        for (let x = 0; x < w; x += 10) R(g, x, 8, 5, h - 12, '#b45309');
        R(g, Math.round(w / 2 - 34), 10, 68, 14, '#0f172a');
        txt(g, 'GOLACO LANCHES', w / 2, 13, '#facc15', 1);
        txt(e, 'GOLACO LANCHES', w / 2, 13, '#fff', 1);
        R(e, 0, 0, w, 2, '#fff');
      }),
      T: flat('#e7e5e4')
    });
    [8.4, 9.3].forEach((x) => {
      box(x - 0.04, 56.66, x + 0.04, 56.74, 0, 0.56, { side: poleC });
      box(x - 0.17, 56.53, x + 0.17, 56.87, 0.56, 0.64, { side: flat('#dc2626'), T: flat('#ef4444') }, { solid: false });
    });
    // cantina: mesas com guarda-sol e cadeiras
    const umb = shared('guardaSol', () => faceTex(1.3, 0.12, (g, e, w, h) => {
      for (let x = 0; x < w; x += 8) {
        R(g, x, 0, 4, h, '#dc2626');
        R(g, x + 4, 0, 4, h, '#f8fafc');
      }
    }));
    const umbTop = shared('guardaSolTopo', () => faceTex(1.3, 1.3, (g, e, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - h / 2, x - w / 2);
        if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2) R(g, x, y, 1, 1, '#dc2626');
        else R(g, x, y, 1, 1, '#f8fafc');
      }
    }));
    TABLES.forEach(([x, y]) => {
      box(x - 0.34, y - 0.34, x + 0.34, y + 0.34, 0.68, 0.74, { side: flat('#e7e5e4'), T: flat('#f8fafc') }, { solid: false });
      box(x - 0.05, y - 0.05, x + 0.05, y + 0.05, 0, 0.68, { side: poleC });
      box(x - 0.03, y - 0.03, x + 0.03, y + 0.03, 0.74, 1.95, { side: poleC }, { solid: false });
      box(x - 0.65, y - 0.65, x + 0.65, y + 0.65, 1.95, 2.07, { side: umb, T: umbTop, B: flat('#7f1d1d') }, { solid: false });
      [-0.56, 0.56].forEach((dx) => {
        const cx = x + dx;
        box(cx - 0.17, y - 0.17, cx + 0.17, y + 0.17, 0, 0.42, { side: side('#78350f', true), T: flat('#92400e') });
        const bx = dx < 0 ? cx - 0.17 : cx + 0.13;
        box(bx, y - 0.17, bx + 0.04, y + 0.17, 0.42, 0.85, { side: flat('#78350f') }, { solid: false });
      });
    });
    // carrinhos: pipoca (calçadão) e sorvete (parque)
    const cart = (c, label, col, col2) => {
      const tex = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, col);
        for (let x = 0; x < w; x += 8) R(g, x, 0, 4, 6, '#f8fafc');
        R(g, 2, 9, w - 4, 10, '#f8fafc');
        txt(g, label, w / 2, 11, col, 1);
        R(g, 0, h - 4, w, 4, sh(col, -0.4));
      });
      box(c.x - 0.45, c.y - 0.28, c.x + 0.45, c.y + 0.28, 0.12, 0.86, { side: tex, T: flat(sh(col, -0.2)) });
      box(c.x - 0.38, c.y - 0.22, c.x + 0.38, c.y + 0.22, 0.86, 1.22, {
        side: shared('vitrine' + label, () => faceTex(0.76, 0.36, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#e0f2fe');
          for (let i = 0; i < 30; i++) R(g, (i * 7) % w, h - 3 - ((i * 5) % Math.max(1, h - 6)), 3, 2, col2);
          R(g, 0, 0, w, 1, '#f8fafc');
          R(e, 0, 0, w, h, '#fff');
        })),
        T: flat('#cbd5e1')
      });
      [-0.4, 0.4].forEach((dx) => box(c.x + dx - 0.02, c.y - 0.02, c.x + dx + 0.02, c.y + 0.02, 1.22, 1.75, { side: poleC }, { solid: false }));
      box(c.x - 0.6, c.y - 0.4, c.x + 0.6, c.y + 0.4, 1.75, 1.82, { side: flat(col), T: flat(col), B: flat(sh(col, -0.3)) }, { solid: false });
      box(c.x - 0.3, c.y - 0.34, c.x + 0.3, c.y - 0.26, 0, 0.3, { side: flat('#111827') }, { solid: false });
    };
    cart(PIPOCA, 'PIPOCA', '#dc2626', '#fde68a');
    cart(SORVETE, 'SORVETE', '#2563eb', '#f9a8d4');
    // mercadinho: caixotes de fruta na calçada
    [[1.75, '#ef4444'], [2.7, '#f97316'], [3.65, '#22c55e']].forEach(([x, c]) => {
      box(x, 55.62, x + 0.85, 56.1, 0, 0.42, {
        side: shared('caixote', () => faceTex(0.85, 0.42, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#a16207');
          for (let y = 2; y < h; y += 5) R(g, 0, y, w, 1, '#78350f');
        })),
        T: shared('fruta' + c, () => faceTex(0.85, 0.48, (g, e, w, h) => {
          R(g, 0, 0, w, h, sh(c, -0.35));
          for (let i = 0; i < 18; i++) R(g, (i * 11) % (w - 4), (i * 7) % (h - 4), 4, 4, i % 4 ? c : sh(c, 0.3));
        }))
      });
    });
    // poste de barbeiro (listrado e aceso)
    box(10.98, 55.56, 11.16, 55.74, 0.9, 1.7, {
      side: shared('barberPole', () => faceTex(0.18, 0.8, (g, e, w, h) => {
        for (let y = -w; y < h; y += 2) {
          const c = Math.floor((y + w) / 6) % 3;
          for (let x = 0; x < w; x++) R(g, x, y + x, 1, 2, ['#dc2626', '#f8fafc', '#2563eb'][c]);
        }
        R(e, 0, 0, w, h, '#fff');
      }))
    }, { solid: false });
    yield;
    // ---- parque: grade (com portões), arco da entrada, cerca viva da avenida, lago, chafariz
    const RAIL = new Map();
    const railing = (lenT) => {
      const k = lenT.toFixed(1);
      if (RAIL.has(k)) return RAIL.get(k);
      const t = faceTex(lenT, 1.0, (g, e, w, h) => {
        // grade de ferro: só as barras (o resto é vazado)
        R(g, 0, 2, w, 3, '#1f2937');
        R(g, 0, h - 8, w, 3, '#1f2937');
        for (let x = 1; x < w; x += 5) {
          R(g, x, 2, 2, h - 2, '#273449');
          R(g, x, 0, 2, 2, '#64748b');
        }
      });
      RAIL.set(k, t);
      return t;
    };
    [[1.0, 5.0], [7.0, 16.5], [18.5, 20.6], [24.6, 25.4]].forEach(([x0, x1]) => {
      const t = railing(x1 - x0);
      box(x0, FENCE_Y, x1, FENCE_Y + 0.08, 0, 1.0, { N: t, S: t, E: flat('#1f2937'), W: flat('#1f2937') });
    });
    // arco do portão principal
    const archSign = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#14532d');
      R(g, 0, 0, w, 2, '#facc15');
      R(g, 0, h - 2, w, 2, '#facc15');
      txt(g, 'PARQUE DO LAGO', w / 2, Math.round(h / 2 - 3), '#f8fafc', 1);
      txt(e, 'PARQUE DO LAGO', w / 2, Math.round(h / 2 - 3), '#fff', 1);
    });
    [16.32, 18.38].forEach((x) => box(x, FENCE_Y - 0.11, x + 0.3, FENCE_Y + 0.19, 0, 2.5, { side: side('#78716c', true), T: flat('#a8a29e') }));
    box(16.32, FENCE_Y - 0.05, 18.68, FENCE_Y + 0.13, 2.05, 2.45, { N: archSign, S: archSign, side: flat('#14532d'), T: flat('#166534'), B: flat('#14532d') }, { solid: false });
    // cerca viva entre o parque e a avenida (com o portão do leste)
    const hedge = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#1f5c2a');
      for (let i = 0; i < w * h * 0.12; i++) {
        const x = (i * 31 + (i >> 4) * 13) % w;
        const y = (i * 17 + (i >> 3) * 5) % h;
        R(g, x, y, 2, 2, i % 3 ? '#2d7a36' : '#14421d');
      }
      R(g, 0, 0, w, 2, '#3f9a4a');
    });
    [[FENCE_Y + 0.08, 70.4], [72.0, AV.y1]].forEach(([y0, y1]) => box(25.0, y0, 25.4, y1, 0, 0.85, { side: hedge, T: hedge }));
    // lago: só bloqueia a passagem (a água é pintada no chão); o chafariz no meio
    for (let y = LAKE.y - LAKE.ry + 0.25; y < LAKE.y + LAKE.ry - 0.25; y += 0.5) {
      const dy = Math.max(Math.abs(y - LAKE.y), Math.abs(y + 0.5 - LAKE.y));
      const hw = LAKE.rx * Math.sqrt(Math.max(0, 1 - (dy / LAKE.ry) ** 2)) - 0.15;
      if (hw > 0.2) box(LAKE.x - hw, y, LAKE.x + hw, y + 0.5, 0, 0.1, {});
    }
    const stone = side('#a8a29e', true);
    box(LAKE.x - 0.62, LAKE.y - 0.62, LAKE.x + 0.62, LAKE.y + 0.62, 0, 0.32, {
      side: stone,
      T: faceTex(1.24, 1.24, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#a8a29e');
        R(g, 4, 4, w - 8, h - 8, '#38bdf8');
        for (let i = 0; i < 20; i++) R(g, 6 + ((i * 13) % (w - 12)), 6 + ((i * 7) % (h - 12)), 3, 1, '#bae6fd');
      })
    });
    box(LAKE.x - 0.1, LAKE.y - 0.1, LAKE.x + 0.1, LAKE.y + 0.1, 0.32, 0.95, { side: stone, T: flat('#cbd5e1') });
    box(LAKE.x - 0.3, LAKE.y - 0.3, LAKE.x + 0.3, LAKE.y + 0.3, 0.95, 1.02, { side: stone, T: flat('#7dd3fc') }, { solid: false });
    // parquinho: balanço e escorregador (areia pintada no chão)
    const metalR = flat('#dc2626');
    [2.5, 4.7].forEach((x) => box(x - 0.05, 74.95, x + 0.05, 75.05, 0, 1.8, { side: metalR }));
    box(2.45, 74.96, 4.75, 75.04, 1.75, 1.85, { side: metalR, T: metalR }, { solid: false });
    [3.1, 4.1].forEach((x) => {
      box(x - 0.18, 74.93, x + 0.18, 75.07, 0.42, 0.48, { side: flat('#facc15'), T: flat('#fde047') }, { solid: false });
      [-0.15, 0.15].forEach((dx) => box(x + dx - 0.01, 74.99, x + dx + 0.01, 75.01, 0.48, 1.75, { side: flat('#94a3b8') }, { solid: false }));
    });
    box(2.3, 76.7, 2.9, 77.3, 0, 1.05, { side: side('#2563eb', true), T: flat('#3b82f6') });
    for (let i = 0; i < 5; i++) {
      const x = 2.9 + i * 0.36;
      const z = 1.0 - i * 0.2;
      box(x, 76.82, x + 0.36, 77.18, Math.max(0, z - 0.12), z, { side: flat('#facc15'), T: flat('#fde047') }, { solid: i > 2 });
    }
    yield;
    // ---- atlas das texturas (só o 3D usa: a cidade inteira em poucas chamadas de desenho)
    yield* buildAtlas(CB);
  };
  // o telão: você no uniforme, o nome, o número e o clube (tudo aceso)
  function drawBoard(g, e, w, h, th, K) {
    const { R, txt } = K;
    R(g, 0, 0, w, h, '#020617');
    R(g, 3, 3, w - 6, h - 6, sh(th.acc, -0.55));
    for (let y = 3; y < h - 3; y += 2) R(g, 3, y, w - 6, 1, sh(th.acc, -0.62));
    // faixa diagonal na cor do clube
    g.fillStyle = sh(th.acc, -0.2);
    g.beginPath();
    g.moveTo(w * 0.42, 3);
    g.lineTo(w * 0.62, 3);
    g.lineTo(w * 0.5, h - 3);
    g.lineTo(w * 0.3, h - 3);
    g.fill();
    drawMePortrait(g, 6, 4, Math.round(w * 0.42), h - 8, th, K, 1.45);
    const name = noAcc(meShirt()).slice(0, 12);
    const tx = Math.round(w * 0.73);
    txt(g, name, tx, 18, '#f8fafc', name.length * 8 <= w * 0.5 ? 2 : 1);
    txt(g, '#' + (prof().number || 10), tx, 40, th.acc2 === '#0f172a' || th.acc2 === '#0a0a0a' || th.acc2 === '#111827' ? '#f8fafc' : th.acc2, 3);
    const s = App().state || {};
    const ach = s.unlockedAchievements || [];
    const tag = ach.includes('ach_ballon_dor') ? 'BOLA DE OURO' : (s.careerGoals || 0) > 0 ? `${s.careerGoals} GOLS NA CARREIRA` : 'O EGOISTA DA LIGA';
    txt(g, noAcc(tag), tx, 66, '#facc15', 1);
    txt(g, noAcc((clubOf() && clubOf().name) || 'LIGA EUROPEIA'), tx, 76, '#e2e8f0', 1);
    R(e, 3, 3, w - 6, h - 6, '#fff');
  }

  // ---------------------------------------------------------------- atlas (só para o 3D)
  // Todas as faces das caixas da cidade numa folha de 2048 de largura (ou poucas): o 3D
  // desenha a cidade com uma chamada por pedaço do mapa em vez de uma por textura (eram
  // centenas). Cada textura ganha uma borda repetida (GUT) para o mipmap não misturar
  // vizinhas. O desenho simples (sem WebGL2) continua usando as texturas soltas.
  const AT_W = 2048;
  const AT_MAXH = 2048;
  const GUT = 6;
  const FACES = ['N', 'S', 'E', 'W', 'T', 'B'];
  function* buildAtlas(CB) {
    const where = new Map();
    CB.forEach((b) => FACES.forEach((d) => {
      const t = b.f[d];
      if (t && t.px && !t.keepDay && !where.has(t) && t.w + GUT * 2 <= AT_W) where.set(t, null);
    }));
    const list = [...where.keys()].sort((a, b) => b.h - a.h || b.w - a.w);
    const pages = [];
    let pg = null;
    let x = 0;
    let y = 0;
    let rowH = 0;
    const newPage = () => {
      pg = { items: [], h: 0 };
      pages.push(pg);
      x = 0;
      y = 0;
      rowH = 0;
    };
    newPage();
    for (const t of list) {
      const w = (t.w + GUT * 2 + 3) & ~3;
      const h = (t.h + GUT * 2 + 3) & ~3;
      if (x + w > AT_W) {
        y += rowH;
        x = 0;
        rowH = 0;
      }
      if (y + h > AT_MAXH) newPage();
      pg.items.push([t, x + GUT, y + GUT]);
      where.set(t, [pages.length - 1, x + GUT, y + GUT]);
      x += w;
      rowH = Math.max(rowH, h);
      pg.h = Math.max(pg.h, y + rowH);
    }
    yield;
    const out = [];
    for (const p of pages) {
      const H = Math.max(8, (p.h + 7) & ~7);
      const A = { w: AT_W, h: H, px: new Uint32Array(AT_W * H), em: new Uint8Array(AT_W * H), atlas: true, maxLevel: 2 };
      out.push(A);
      let n = 0;
      for (const [t, ax, ay] of p.items) {
        if (++n % 40 === 0) yield; // (em fatias)
        const W = AT_W;
        for (let yy = -GUT; yy < t.h + GUT; yy++) {
          const sy = yy < 0 ? 0 : yy >= t.h ? t.h - 1 : yy;
          const so = sy * t.w;
          const d = (ay + yy) * W + ax;
          A.px.set(t.px.subarray(so, so + t.w), d);
          if (t.em) A.em.set(t.em.subarray(so, so + t.w), d);
          const c0 = t.px[so];
          const c1 = t.px[so + t.w - 1];
          const e0 = t.em ? t.em[so] : 0;
          const e1 = t.em ? t.em[so + t.w - 1] : 0;
          for (let k = 1; k <= GUT; k++) {
            A.px[d - k] = c0;
            A.px[d + t.w - 1 + k] = c1;
            A.em[d - k] = e0;
            A.em[d + t.w - 1 + k] = e1;
          }
        }
      }
    }
    yield;
    // cada caixa: em que folha e em que pedaço dela fica cada face (u0, v0, u1, v1)
    CB.forEach((b) => {
      let atl = null;
      FACES.forEach((d) => {
        const t = b.f[d];
        const wh = t && where.get(t);
        if (!wh) return;
        const A = out[wh[0]];
        atl = atl || { page: A, uv: {} };
        if (atl.page !== A) return; // (caixa com faces em duas folhas: essa face fica solta)
        atl.uv[d] = [wh[1] / A.w, wh[2] / A.h, (wh[1] + t.w) / A.w, (wh[2] + t.h) / A.h];
      });
      b.atl = atl;
    });
    C.atlasInfo = { pages: out.length, texturas: list.length, h: out.map((a) => a.h) };
  }

  // ---------------------------------------------------------------- enfeites em pé (js/hub3d.js: buildSprites)
  const TREETEX = [];
  function treeTex(K, kind) {
    if (TREETEX[kind]) return TREETEX[kind];
    const R = K.R;
    const blob = (g, cx, cy, r, c) => {
      for (let y = -r; y <= r; y++) {
        const hw = Math.round(Math.sqrt(r * r - y * y));
        R(g, cx - hw, cy + y, hw * 2, 1, c);
      }
    };
    let t;
    if (kind === 1) {
      // cerejeira: tronco escuro torto e a copa cor-de-rosa
      t = K.makeTex(48, 74, (g) => {
        R(g, 21, 44, 6, 30, '#3f2a1d');
        R(g, 17, 40, 5, 8, '#3f2a1d');
        R(g, 27, 38, 5, 9, '#3f2a1d');
        blob(g, 24, 28, 18, '#be185d');
        blob(g, 14, 32, 10, '#db2777');
        blob(g, 34, 31, 11, '#db2777');
        blob(g, 24, 18, 13, '#ec4899');
        blob(g, 18, 14, 7, '#f9a8d4');
        blob(g, 30, 22, 6, '#f9a8d4');
        for (let i = 0; i < 46; i++) R(g, 6 + ((i * 17) % 36), 8 + ((i * 11) % 36), 1, 1, i % 3 ? '#fce7f3' : '#9d174d');
      });
    } else if (kind === 2) {
      // árvore alta e fina (alameda)
      t = K.makeTex(30, 84, (g) => {
        R(g, 13, 56, 4, 28, '#4a2f1d');
        for (let y = 4; y < 62; y++) {
          const k = Math.sin(((y - 4) / 58) * Math.PI);
          const hw = Math.round(3 + k * 10);
          R(g, 15 - hw, y, hw * 2, 1, y % 4 === 0 ? '#166534' : '#15803d');
        }
        for (let i = 0; i < 30; i++) R(g, 6 + ((i * 13) % 18), 8 + ((i * 7) % 50), 1, 1, i % 2 ? '#22c55e' : '#052e16');
      });
    } else {
      t = K.makeTex(44, 76, (g) => {
        R(g, 19, 46, 6, 30, '#4a2f1d');
        R(g, 19, 46, 2, 30, '#6b4429');
        blob(g, 22, 30, 17, '#14532d');
        blob(g, 13, 34, 10, '#166534');
        blob(g, 31, 33, 11, '#166534');
        blob(g, 22, 20, 13, '#15803d');
        blob(g, 17, 16, 7, '#16a34a');
        blob(g, 28, 24, 6, '#16a34a');
        for (let i = 0; i < 40; i++) R(g, 6 + ((i * 17) % 32), 8 + ((i * 11) % 36), 1, 1, i % 3 ? '#22c55e' : '#052e16');
      });
    }
    TREETEX[kind] = t;
    return t;
  }
  // placa de rua num poste
  function signTex(K, name) {
    const w = Math.max(52, name.length * 4 + 8);
    return K.makeTex(w, 84, (g) => {
      const R = K.R;
      R(g, Math.round(w / 2) - 1, 10, 3, 74, '#475569');
      R(g, 0, 0, w, 12, '#14532d');
      R(g, 1, 1, w - 2, 10, '#166534');
      K.txt(g, name, w / 2, 4, '#f8fafc', 1);
    });
  }
  C.sprites = function (th, add, L, K) {
    const P = Hub.P;
    const ks = [2.3, 2.2, 2.4];
    TREES.forEach(([x, y, kind], i) => L.push({ key: 'tree' + i, tex: treeTex(K, kind), x, y, z: y > R2.b0 && y < R2.b1 && x < 25 ? 0.38 : 0, r: 0.24, k: ks[kind], shadow: 0.5, city: true }));
    // (as do canteiro do calçadão ficam em cima do vaso)
    L.forEach((s) => {
      if (s.city && s.z === 0.38) s.shadow = 0;
    });
    const o = (r) => ({ r, city: true });
    [[11.2, 41.8], [24.6, 41.8], [36.0, 43.55], [44.6, 42.5], [AV.cw - 0.3, 58.2], [26.2, 54.6], [12.6, 63.25], [44.6, 55.85], [57.6, 62.9], [10.2, 65.3], [19.4, 72.6]].forEach(([x, y]) => add('bin', () => P.bin(0, 0), x, y, o(0.18)));
    [[2.4, 43.8], [9.0, 36.75], [17.0, 36.75], [23.4, 43.8], [29.6, 36.75], [50.5, 43.9], [21.0, 55.8], [25.0, 55.95], [46.0, 55.85], [55.0, 55.85], [AV.cw - 0.3, 47.6]].forEach(([x, y]) => add('plant', () => P.plant(0, 0), x, y, o(0.2)));
    // cavalete da banca com a manchete do dia (você)
    const s = App().state || {};
    const head = (s.unlockedAchievements || []).includes('ach_ballon_dor') ? 'BOLA DE OURO!' : (s.careerGoals || 0) > 0 ? `${s.careerGoals} GOLS!` : 'A NOVA ESTRELA';
    const board = K.makeTex(34, 42, (g) => {
      const R = K.R;
      R(g, 4, 30, 2, 12, '#57534e');
      R(g, 28, 30, 2, 12, '#57534e');
      R(g, 1, 0, 32, 32, '#0f172a');
      R(g, 2, 1, 30, 30, '#f8fafc');
      R(g, 2, 1, 30, 7, '#dc2626');
      K.txt(g, 'HOJE', 17, 2, '#f8fafc', 1);
      K.txt(g, noAcc(meShirt()).slice(0, 7), 17, 11, '#0f172a', 1);
      K.txt(g, noAcc(head).slice(0, 7), 17, 18, '#b91c1c', 1);
      K.txt(g, noAcc(head).slice(7, 14), 17, 24, '#b91c1c', 1);
    });
    L.push({ key: 'cavalete', tex: board, x: BANCA.x1 + 0.5, y: 43.45, r: 0.15, k: 1.4, shadow: 0.2, city: true });
    // cardápio da lanchonete (lousa na calçada)
    const menu = K.makeTex(30, 40, (g) => {
      const R = K.R;
      R(g, 3, 28, 2, 12, '#78350f');
      R(g, 25, 28, 2, 12, '#78350f');
      R(g, 0, 0, 30, 30, '#78350f');
      R(g, 2, 2, 26, 26, '#1c1917');
      K.txt(g, 'LANCHE', 15, 4, '#facc15', 1);
      K.txt(g, 'DO', 15, 10, '#facc15', 1);
      K.txt(g, 'CRAQUE', 15, 16, '#facc15', 1);
      K.txt(g, '40', 15, 22, '#f8fafc', 1);
    });
    L.push({ key: 'lousa', tex: menu, x: 5.75, y: 56.15, r: 0.12, k: 1.25, shadow: 0.15, city: true });
    // placas das ruas nas esquinas
    [['R. DA VITORIA', 15.6, 38.25], ['AV. DOS CAMPEOES', AV.cw - 0.3, 44.55], ['CALCADAO', 25.75, 58.3], ['R. DAS TORRES', 35.3, 57.6]].forEach(([nm, x, y], i) => L.push({ key: 'placa' + i, tex: signTex(K, nm), x, y, r: 0.08, k: 1.6, shadow: 0.1, city: true }));
    // água do chafariz (acesa)
    const jet = K.makeTex(34, 46, (g, e) => {
      const R = K.R;
      for (let i = 0; i < 6; i++) {
        const a = (i / 5) * Math.PI;
        for (let s2 = 0; s2 < 16; s2++) {
          const t = s2 / 15;
          const x = 17 + Math.cos(a) * t * 15;
          const y = 8 + t * 34 - Math.sin(Math.PI * t) * 6;
          R(g, Math.round(x), Math.round(y), 2, 2, s2 % 3 ? '#bae6fd' : '#f0f9ff');
        }
      }
      R(g, 15, 0, 4, 44, '#e0f2fe');
      R(g, 16, 0, 2, 44, '#f8fafc');
      R(e, 15, 0, 4, 44, '#fff');
    });
    L.push({ key: 'chafariz', tex: jet, x: LAKE.x, y: LAKE.y + 0.01, z: 0.96, r: 0, k: 1.3, shadow: 0, glow: true, city: true });
  };

  // ---------------------------------------------------------------- luzes (js/hub3d.js: buildLightGen)
  // (na cidade as luzes de fora valem para todas as ruas, a praça e o parque: área 'rua')
  C.ambient = (amb) => [amb[0] * 0.5 + 0.06, amb[1] * 0.5 + 0.07, amb[2] * 0.5 + 0.15];
  C.lights = function (th, add) {
    const lamp = '#fdba74';
    POSTS.forEach(([x, y, d]) => {
      const ns = Math.abs(d) === 1;
      add(ns ? x : x + Math.sign(d) * 0.45, ns ? y + d * 0.45 : y, 4.6, lamp, 0.95, 'rua', { z: 2.5 });
    });
    MPOSTS.forEach((y) => [-0.62, 0.62].forEach((dx) => add((AV.m0 + AV.m1) / 2 + dx, y, 4.4, lamp, 0.85, 'rua', { z: 2.75 })));
    GLOBES.forEach(([x, y]) => add(x, y, 3.8, '#fef3c7', 0.8, 'rua', { z: 2.35 }));
    // vitrines (cor da loja) e a entrada do seu prédio
    NORTH.forEach(([x0, x1, , , shop, color]) => {
      if (shop) add((x0 + x1) / 2, 37.1, 2.6, color, 0.5, 'rua', { z: 1.0 });
    });
    const out = { N: [0, 0.65], S: [0, -0.65], W: [0.65, 0], E: [-0.65, 0] };
    ROWS.forEach((row) => row.list.forEach(([a0, a1, , style, shop, color, ex]) => {
      if (!shop && style !== 'tower' && style !== 'tower2') return;
      const c = ex && ex.mega ? th.acc : color || '#fef3c7';
      const m = (a0 + a1) / 2;
      const [ox, oy] = out[row.side];
      const p = row.side === 'N' ? [m, row.p[1]] : row.side === 'S' ? [m, row.p[0]] : row.side === 'W' ? [row.p[1], m] : [row.p[0], m];
      add(p[0] + ox, p[1] + oy, ex && ex.mega ? 3.4 : 2.6, c, ex && ex.mega ? 0.65 : 0.5, 'rua', { z: 1.0 });
    }));
    add(13.5, 36.9, 2.6, '#fef3c7', 0.8, 'rua', { z: 1.9 });
    add((BANCA.x0 + BANCA.x1) / 2, 42.8, 2.2, '#fef3c7', 0.55, 'rua', { z: 1.3 });
    add(AV.e0 - 0.6, (BUS.y0 + BUS.y1) / 2, 2.2, '#bae6fd', 0.5, 'rua', { z: 1.9 });
    // metrô (azul), lanchonete, carrinhos, chafariz, arco do parque, estação e o outdoor
    METRO.forEach((m) => add((m.x0 + m.x1) / 2 + (m.face === 'E' ? 0.9 : 0), m.face === 'N' ? m.y0 - 0.8 : (m.y0 + m.y1) / 2, 3.0, '#60a5fa', 0.7, 'rua', { z: 2.0 }));
    add((LANCHE.x0 + LANCHE.x1) / 2, 56.8, 3.0, '#fbbf24', 0.65, 'rua', { z: 1.2 });
    add(PIPOCA.x, PIPOCA.y, 2.0, '#fde68a', 0.45, 'rua', { z: 1.1 });
    add(SORVETE.x, SORVETE.y, 2.0, '#bae6fd', 0.45, 'rua', { z: 1.1 });
    add(LAKE.x, LAKE.y, 3.4, '#7dd3fc', 0.6, 'rua', { z: 1.0 });
    add(17.5, 64.2, 2.6, '#fde68a', 0.5, 'rua', { z: 2.2 });
    add(30.5, 77.4, 6.0, '#fef3c7', 0.6, 'rua', { z: 2.0 });
    add(30.5, 77.6, 6.5, th.acc, 0.45, 'rua', { z: 6.0 });
    // telão e refletores da quadra
    add(57.6, 40, 5.6, th.acc, 0.55, 'rua', { z: 3.3 });
    add(52, 40, 6.6, '#f8fafc', 0.55, 'rua', { z: 4.0 });
  };
  // ---------------------------------------------------------------- hora do dia
  // Cada vez que você sai de casa passa um pedaço do dia: MANHÃ → FIM DE TARDE → NOITE →
  // manhã... (state.cityClock; a 1ª saída é de manhã). A troca é barata: nada é montado de
  // novo. No 3D mudam o céu, a névoa, a luz do sol (calculada no shader, com a sombra dos
  // prédios, por cima da luz assada da noite) e as texturas acesas (janelas, letreiros e
  // postes ganham uma versão "apagada", feita na hora). De noite tem menos gente na rua.
  // No desenho simples (sem WebGL2) a cidade fica sempre de noite.
  const MODES = ['manha', 'tarde', 'noite'];
  C.MODE_NAME = { manha: '☀️ MANHÃ', tarde: '🌇 FIM DE TARDE', noite: '🌙 NOITE' };
  C.mode = () => {
    const G = Hub.GL3D;
    if (!G || G.ok === false || Hub.forceSW) return 'noite';
    const s = App().state || {};
    const k = s.cityClock || 0;
    return MODES[((k % 3) + 3) % 3];
  };
  const unit = (x, y, z) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  };
  // sol: [x, altura, y] (de onde vem a luz), cor do sol, luz do céu (sombra) e quanto do dia
  // entra (tarde = metade: os postes e as janelas já acesos)
  const AIR = {
    manha: { key: 'manha', skyTop: [0.18, 0.45, 0.92], skyHor: [0.78, 0.88, 0.97], stars: 0, fog: [0.72, 0.8, 0.9], fogK: 0.011, expo: 1.0, day: 1, sun: unit(0.45, 0.78, 0.43), sunC: [1.0, 0.9, 0.7], ambD: [0.4, 0.46, 0.6], dayTex: true },
    tarde: { key: 'tarde', skyTop: [0.24, 0.24, 0.52], skyHor: [1.0, 0.58, 0.3], stars: 0.001, fog: [0.55, 0.4, 0.36], fogK: 0.015, expo: 1.03, day: 0.72, sun: unit(-0.55, 0.36, 0.77), sunC: [1.0, 0.6, 0.32], ambD: [0.42, 0.36, 0.44], dayTex: false },
    noite: { key: 'noite', skyTop: [0.04, 0.05, 0.16], skyHor: [0.55, 0.27, 0.2], stars: 0.004, fog: [0.07, 0.06, 0.11], fogK: 0.02, expo: 1.08, day: 0 }
  };
  // céu, névoa, exposição e sol na rua (o motor 3D usa quando você está na cidade)
  C.air = function (ai) {
    const id = (Hub._3d && Hub._3d.AREA_IDS[ai]) || '';
    if (!CITY_AREAS[id]) return null;
    const a = AIR[C.mode()];
    return id === 'portaria' ? Object.assign({}, a, { fogK: 0.04 }) : a;
  };
  // Sombra do sol: a cada 1/4 de ladrilho da cidade, até que altura um ponto ali fica na
  // sombra dos prédios (o raio até o sol bate em algum prédio antes?). Feito uma vez por hora
  // do dia (e por montagem do prédio), com os volumes que as caixas deixaram em BLD. O 3D
  // usa como textura (js/hub3d_gl.js: cityShade): uma leitura por pixel em vez de uma conta.
  const SMK = 4;
  const SMW = MWC * SMK;
  const SMH = ROWS_C * SMK;
  function heightMap() {
    if (HMAP) return HMAP;
    HMAP = new Float32Array(SMW * SMH);
    BLD.forEach(([x0, y0, x1, y1, h]) => {
      const i0 = clamp(Math.round(x0 * SMK), 0, SMW);
      const i1 = clamp(Math.round(x1 * SMK), 0, SMW);
      const j0 = clamp(Math.round((y0 - Y0) * SMK), 0, SMH);
      const j1 = clamp(Math.round((y1 - Y0) * SMK), 0, SMH);
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (HMAP[j * SMW + i] < h) HMAP[j * SMW + i] = h;
    });
    return HMAP;
  }
  // (em fatias: a conta é feita aos poucos no tempo livre quando você entra na cidade de dia —
  // warmSun — e termina de uma vez se o 1º quadro de dia chegar antes)
  const SUNJOB = {};
  function* sunMapGen(key) {
    const a = AIR[key];
    if (!a || !a.sun || !BLD.length) return;
    const H = heightMap();
    let maxH = 0;
    for (let i = 0; i < H.length; i++) if (H[i] > maxH) maxH = H[i];
    const sun = a.sun;
    const hl = Math.hypot(sun[0], sun[2]) || 1e-6;
    const dx = sun[0] / hl;
    const dy = sun[2] / hl;
    const dz = sun[1] / hl / SMK; // quanto o raio sobe a cada amostra andada
    const steps = Math.min(SMK * 34, Math.ceil(maxH / dz));
    const vals = new Float32Array(SMW * SMH);
    const data = new Uint8Array(SMW * SMH * 4);
    for (let j = 0; j < SMH; j++) {
      if ((j & 7) === 7) yield;
      for (let i = 0; i < SMW; i++) {
        let best = 0;
        let x = i + 0.5;
        let y = j + 0.5;
        for (let k = 1; k <= steps; k++) {
          x += dx;
          y += dy;
          if (x < 0 || y < 0 || x >= SMW || y >= SMH) break;
          const rise = k * dz;
          if (maxH - rise <= best) break;
          const hh = H[(y | 0) * SMW + (x | 0)] - rise;
          if (hh > best) best = hh;
        }
        const n = j * SMW + i;
        vals[n] = best;
        data[n * 4] = Math.min(255, Math.round((best / 16) * 255));
        data[n * 4 + 3] = 255;
      }
    }
    SUNMAPS[key] = { w: SMW, h: SMH, data, vals, key, cells: [MWC, ROWS_C, Y0] };
  }
  C.sunMap = function (key) {
    if (SUNMAPS[key]) return SUNMAPS[key];
    const g = SUNJOB[key] || (SUNJOB[key] = sunMapGen(key));
    while (!g.next().done);
    delete SUNJOB[key];
    return SUNMAPS[key] || null;
  };
  function warmSun(key) {
    if (SUNMAPS[key] || !AIR[key] || !AIR[key].sun || !BLD.length) return;
    const g = SUNJOB[key] || (SUNJOB[key] = sunMapGen(key));
    const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 30));
    const pump = () => {
      if (SUNJOB[key] !== g) return;
      const t0 = performance.now();
      while (performance.now() - t0 < 4) {
        if (g.next().done) {
          delete SUNJOB[key];
          return;
        }
      }
      later(pump, { timeout: 200 });
    };
    later(pump, { timeout: 200 });
  }
  // o ponto (x, y, altura z) está na sombra dos prédios? (igual à conta do shader)
  function shadeAt(x, y, z, key) {
    const m = C.sunMap(key);
    if (!m) return 1;
    const i = Math.floor(x * SMK);
    const j = Math.floor((y - Y0) * SMK);
    if (i < 0 || j < 0 || i >= SMW || j >= SMH) return 1;
    return z < m.vals[j * SMW + i] ? 0 : 1;
  }
  // luz de dia num boneco em pé na cidade (céu + sol, se não estiver na sombra)
  C.dayLight = (x, y, F, out) => {
    const s = shadeAt(x, y, 0.8, F.key) * 0.6;
    for (let i = 0; i < 3; i++) out[i] = F.ambD[i] * 0.85 + F.sunC[i] * s;
    return out;
  };
  // versão "de dia" de uma textura da cidade: o que era aceso fica apagado — janela vira vidro
  // refletindo o céu, letreiro e lâmpada ficam com a cor sem luz (o telão continua ligado)
  const DAY = new WeakMap();
  C.dayOf = (t) => {
    if (!t || !t.em || t.keepDay) return t;
    let d = DAY.get(t);
    if (d) return d;
    const px = new Uint32Array(t.px);
    for (let i = 0; i < px.length; i++) {
      if (!t.em[i]) continue;
      const c = px[i];
      const r = c & 255;
      const g = (c >>> 8) & 255;
      const b = (c >>> 16) & 255;
      let R2;
      let G2;
      let B2;
      if (r > 190 && g > 150 && b < 215 && r >= b) {
        // vidro: azul-acinzentado do céu, com um grão leve
        const k = (i * 7) % 5;
        R2 = 112 + k * 3;
        G2 = 142 + k * 3;
        B2 = 168 + k * 2;
      } else {
        R2 = r * 0.55 + 14;
        G2 = g * 0.55 + 16;
        B2 = b * 0.55 + 20;
      }
      px[i] = ((c & 0xff000000) | ((B2 | 0) << 16) | ((G2 | 0) << 8) | (R2 | 0)) >>> 0;
    }
    d = { w: t.w, h: t.h, px, em: null, maxLevel: t.maxLevel };
    DAY.set(t, d);
    return d;
  };

  // ---------------------------------------------------------------- chão (js/hub3d.js: bakeGen)
  // O chão da cidade é pintado em retângulos e formas (elipse, anel) com materiais prontos:
  // ladrilhos de 128 x 128 texels (4 x 4 ladrilhos do mapa) alinhados ao mundo, copiados
  // linha a linha. Só os detalhes pequenos (faixas, bueiros, quadra) vão texel a texel.
  // (antes era uma função por texel em tudo: 3 vezes mais chão agora sai mais rápido)
  const MT = 128;
  const pk = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const H = (u, v) => (Math.imul(u + 11, 73856093) ^ Math.imul(v + 7, 19349663)) >>> 0;
    const mk = (fn) => {
      const t = new Uint32Array(MT * MT);
      for (let v = 0; v < MT; v++) for (let u = 0; u < MT; u++) t[v * MT + u] = fn(u, v, H(u, v));
      return t;
    };
    MATS = {
      // ladrilhos de cimento 0,5 x 0,5
      calcada: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        const tile = (((u >> 4) + (v >> 4)) & 1) === 0;
        let r = (tile ? 118 : 108) + n;
        let g = (tile ? 116 : 106) + n;
        let b = (tile ? 112 : 104) + n;
        if ((u & 15) === 0 || (v & 15) === 0) {
          r -= 30;
          g -= 30;
          b -= 30;
        }
        return pk(r, g, b);
      }),
      // asfalto com grão e pedrinhas claras; a sarjeta (junto do meio-fio) mais escura
      asfalto: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        const k = ((h >>> 3) & 63) === 0 ? 18 : 0;
        return pk(40 + n + k, 42 + n + k, 50 + n + k);
      }),
      sarjeta: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        return pk(28 + n, 30 + n, 38 + n);
      }),
      // calçada portuguesa: ondas pretas e brancas de pedrinha
      portuguesa: mk((u, v, h) => {
        const wave = (v / 32 + Math.sin((u / 32) * (Math.PI / 2)) * 0.32 + 8) % 0.8;
        const st = ((u >> 1) + (v >> 1)) & 1;
        let r;
        let g;
        let b;
        if (wave < 0.37) {
          r = 46 + st * 8;
          g = 44 + st * 8;
          b = 44 + st * 8;
        } else {
          r = 196 + st * 10;
          g = 190 + st * 10;
          b = 180 + st * 10;
        }
        if (((u & 1) === 0 && (v & 1) === 0) || ((h >>> 5) & 15) === 0) {
          r *= 0.82;
          g *= 0.82;
          b *= 0.82;
        }
        return pk(r, g, b);
      }),
      // calçadão: bloquinhos 0,5 x 0,25 desencontrados, cada um de um tom
      piso: mk((u, v, h) => {
        const row = v >> 3;
        const off = row & 1 ? 8 : 0;
        const bx = (u + off) >> 4;
        const hb = (Math.imul(bx + 3, 2654435761) ^ Math.imul(row + 5, 40503)) >>> 0;
        const t = hb % 3;
        const n = ((h >>> 8) & 7) - 3;
        let r = [168, 152, 176][t] + n;
        let g = [146, 134, 156][t] + n;
        let b = [126, 118, 134][t] + n;
        if ((v & 7) === 0 || ((u + off) & 15) === 0) {
          r -= 34;
          g -= 34;
          b -= 34;
        }
        return pk(r, g, b);
      }),
      // faixa do meio do calçadão: lajotas de barro com um losango
      faixa: mk((u, v, h) => {
        const n = ((h >>> 8) & 7) - 3;
        const x = (u & 31) - 16;
        const y = (v & 31) - 16;
        const dia = Math.abs(x) + Math.abs(y) < 9;
        let r = (dia ? 196 : 158) + n;
        let g = (dia ? 120 : 84) + n;
        let b = (dia ? 82 : 58) + n;
        if ((u & 31) === 0 || (v & 31) === 0) {
          r -= 40;
          g -= 30;
          b -= 24;
        }
        return pk(r, g, b);
      }),
      // grama com tufos e florzinhas
      grama: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        const tuft = ((h >>> 4) & 15) < 3;
        let r = 58 + n;
        let g = 112 + n * 2;
        let b = 44 + n;
        if (tuft) {
          r -= 14;
          g -= 22;
          b -= 10;
        }
        const f = (h >>> 12) & 1023;
        if (f === 0) return pk(250, 250, 240);
        if (f === 1) return pk(250, 204, 21);
        return pk(r, g, b);
      }),
      // pista de corrida: saibro avermelhado
      terra: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        const p = ((h >>> 2) & 31) === 0 ? 22 : 0;
        return pk(168 + n + p, 118 + n + p, 82 + n + p);
      }),
      // água do lago (ondinhas claras)
      agua: mk((u, v, h) => {
        const n = ((h >>> 8) & 7) - 3;
        const rip = Math.sin(u * 0.4 + Math.sin(v * 0.21) * 2.0) > 0.93 && (v & 3) === 0;
        if (rip) return pk(120, 190, 220);
        return pk(26 + n, 82 + n, 118 + n);
      }),
      // pedras da beira do lago
      pedra: mk((u, v, h) => {
        const cell = (((u >> 3) + ((v >> 3) & 1) * 4) & 15) + (v >> 3) * 16;
        const hb = Math.imul(cell + 1, 2654435761) >>> 0;
        const t = 120 + (hb % 50);
        const edge = (u & 7) === 0 || (v & 7) === 0;
        return edge ? pk(70, 68, 64) : pk(t, t - 4, t - 10);
      }),
      // mármore claro (praça da estação do metrô)
      marmore: mk((u, v, h) => {
        const n = ((h >>> 8) & 7) - 3;
        const vein = Math.abs(Math.sin((u + v * 0.6) * 0.09) + Math.sin(v * 0.05) * 0.6) < 0.05;
        let r = 196 + n;
        let g = 192 + n;
        let b = 184 + n;
        if (vein) {
          r -= 40;
          g -= 40;
          b -= 36;
        }
        if ((u & 31) === 0 || (v & 31) === 0) {
          r -= 26;
          g -= 26;
          b -= 26;
        }
        return pk(r, g, b);
      }),
      // areia do parquinho
      areia: mk((u, v, h) => {
        const n = ((h >>> 8) & 15) - 7;
        return pk(214 + n, 188 + n, 136 + n);
      }),
      // canteiro de flores
      flores: mk((u, v, h) => {
        const f = (h >>> 6) & 15;
        if (f < 3) return [pk(236, 72, 153), pk(239, 68, 68), pk(168, 85, 247)][f];
        if (f < 5) return pk(250, 204, 21);
        if (f === 5) return pk(248, 250, 252);
        const n = ((h >>> 8) & 7) - 3;
        return pk(44 + n, 92 + n, 36 + n);
      }),
      // piso tátil amarelo (bolinhas) na ponta das faixas de pedestre
      tatil: mk((u, v) => ((u & 3) === 1 && (v & 3) === 1 ? pk(161, 120, 8) : pk(214, 170, 30)))
    };
    return MATS;
  }

  C.paintFloor = function* (th, FA, FW, m, K) {
    const X = Hub._3d;
    const AID = X.AREA_IDS;
    const MW = X.C.MW;
    const FT = K.FTX;
    const paint = Uint8Array.from(AID, (id) => (OUT_AREAS[id] ? 1 : 0));
    const rows = m.rows;
    // ladrilhos que o pintor pode pintar: os das ruas, praça e parque (o resto fica vazio)
    const ok = new Uint8Array(MW * rows);
    for (let y = Y0; y < rows; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const a = m.area[i];
      if (a >= 0 && !m.solid[i] && paint[a]) ok[i] = 1;
    }
    const M = mats();
    const TX = (w) => Math.round(w * FT);
    // uma linha de texels [gx0, gx1) com um material (ou uma cor só)
    const span = (gy, gx0, gx1, mat, col) => {
      const cy = (gy / FT) | 0;
      if (cy < Y0 || cy >= rows) return;
      const row = gy * FW;
      const mrow = (gy & (MT - 1)) * MT;
      let gx = Math.max(0, gx0);
      const end = Math.min(FW, gx1);
      while (gx < end) {
        const cx = (gx / FT) | 0;
        const cend = Math.min(end, (cx + 1) * FT);
        if (ok[cy * MW + cx]) {
          if (mat) for (let x = gx; x < cend; x++) FA[row + x] = mat[mrow + (x & (MT - 1))];
          else FA.fill(col, row + gx, row + cend);
        }
        gx = cend;
      }
    };
    const rect = (x0, y0, x1, y1, mat, col) => {
      const gx0 = TX(x0);
      const gx1 = TX(x1);
      for (let gy = TX(y0), e = TX(y1); gy < e; gy++) span(gy, gx0, gx1, mat, col);
    };
    // elipse cheia ou anel (ri = raios de dentro)
    const ell = (cx, cy, rx, ry, mat, rix, riy) => {
      for (let gy = TX(cy - ry), e = TX(cy + ry); gy < e; gy++) {
        const dy = ((gy + 0.5) / FT - cy) / ry;
        if (dy * dy >= 1) continue;
        const hw = rx * Math.sqrt(1 - dy * dy);
        const di = rix ? ((gy + 0.5) / FT - cy) / riy : 2;
        if (di * di >= 1) {
          span(gy, TX(cx - hw), TX(cx + hw), mat);
          continue;
        }
        const iw = rix * Math.sqrt(1 - di * di);
        span(gy, TX(cx - hw), TX(cx - iw), mat);
        span(gy, TX(cx + iw), TX(cx + hw), mat);
      }
    };
    // texel a texel (detalhes): fn(wx, wy, gx, gy, cor de agora) → cor nova ou -1
    const each = (x0, y0, x1, y1, fn) => {
      for (let gy = Math.max(TX(y0), Y0 * FT), e = Math.min(TX(y1), rows * FT); gy < e; gy++) {
        const cy = (gy / FT) | 0;
        const wy = (gy + 0.5) / FT;
        for (let gx = Math.max(0, TX(x0)), e2 = Math.min(FW, TX(x1)); gx < e2; gx++) {
          if (!ok[cy * MW + ((gx / FT) | 0)]) continue;
          const i = gy * FW + gx;
          const c = fn((gx + 0.5) / FT, wy, gx, gy, FA[i]);
          if (c !== -1) FA[i] = c;
        }
      }
    };
    const top = pk(176, 178, 184);
    const face = pk(150, 152, 158);
    const white = pk(214, 218, 224);
    const yellow = pk(202, 160, 22);
    // meio-fio: a pedra clara do lado da calçada (s = de que lado fica a calçada)
    const curbH = (x0, x1, c, s) => {
      if (s < 0) {
        rect(x0, c - 0.12, x1, c, null, top);
        rect(x0, c, x1, c + 0.06, null, face);
      } else {
        rect(x0, c, x1, c + 0.12, null, top);
        rect(x0, c - 0.06, x1, c, null, face);
      }
    };
    const curbV = (y0, y1, c, s) => {
      if (s < 0) {
        rect(c - 0.12, y0, c, y1, null, top);
        rect(c, y0, c + 0.06, y1, null, face);
      } else {
        rect(c, y0, c + 0.12, y1, null, top);
        rect(c - 0.06, y0, c, y1, null, face);
      }
    };
    // 1) a base: calçada de cimento; a praça e a praça da estação central em pedra portuguesa;
    // o calçadão de bloquinhos com a faixa do meio de lajotas; o parque de grama
    for (let y = Y0; y < rows; y += 6) {
      rect(0, y, MW, Math.min(rows, y + 6), M.calcada);
      yield; // (em fatias: o prédio de uma cena que vem aí é montado aos poucos)
    }
    rect(STREET_X1, 36, 61, 45, M.portuguesa);
    rect(AV.w1, AV.end, AV.e0, AV.y1 + 0.6, M.portuguesa);
    rect(1, R2.f1, 25.0, FENCE_Y + 0.1, M.piso);
    rect(1, R2.b0, 25.0, R2.b1, M.faixa);
    rect(1, FENCE_Y + 0.08, 25.0, AV.y1 + 0.6, M.grama);
    rect(20.4, FENCE_Y + 0.08, 25.0, 67.2, M.marmore);
    yield;
    // 2) asfalto, sarjetas e meio-fio (rua da vitória, avenida, rua das torres)
    rect(1.0, CURB_N, STREET_X1, CURB_S, M.asfalto);
    rect(AV.cw, CURB_S, AV.ce, AV.end, M.asfalto);
    rect(AV.ce, R2.cn, 60.4, R2.cs, M.asfalto);
    [[1.0, CURB_N, STREET_X1, CURB_N + 0.12], [1.0, CURB_S - 0.12, AV.cw, CURB_S], [AV.ce, CURB_S - 0.12, STREET_X1, CURB_S], [AV.cw, CURB_S, AV.cw + 0.12, AV.end], [AV.ce - 0.12, CURB_S, AV.ce, R2.cn], [AV.ce - 0.12, R2.cs, AV.ce, AV.end], [AV.ce, R2.cn, 60.4, R2.cn + 0.12], [AV.ce, R2.cs - 0.12, 60.4, R2.cs]].forEach(([a, b, c, d]) => rect(a, b, c, d, M.sarjeta));
    curbH(1.0, STREET_X1, CURB_N, -1);
    curbH(1.0, AV.cw, CURB_S, 1);
    curbH(AV.ce, STREET_X1, CURB_S, 1);
    curbV(CURB_N, CURB_S, STREET_X1, 1);
    curbV(CURB_S, AV.end, AV.cw, -1);
    curbV(CURB_S, R2.cn, AV.ce, 1);
    curbV(R2.cs, AV.end, AV.ce, 1);
    curbH(AV.cw, AV.ce, AV.end, 1);
    curbH(AV.ce, 60.4, R2.cn, -1);
    curbH(AV.ce, 60.4, R2.cs, 1);
    yield;
    // 3) pintura: faixa amarela tracejada no meio das ruas, faixas de pedestre (barras brancas
    // gastas), linhas de parada e piso tátil nas pontas
    for (let x = 1.8; x < STREET_X1 - 0.6; x += 1.6) rect(x, 39.955, x + 0.9, 40.045, null, yellow);
    for (let x = AV.ce + 2.5; x < 59.4; x += 1.6) if (x > 35.6 && x + 0.9 < 57.7) rect(x, 59.455, x + 0.9, 59.545, null, yellow);
    ZEBRAS.forEach(([x0, y0, x1, y1, hz]) => {
      each(x0, y0, x1, y1, (wx, wy, gx, gy) => {
        const on = hz ? (wy - y0) % 0.5 < 0.25 : (wx - x0) % 0.5 < 0.25;
        if (!on) return -1;
        const k = (((Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 12) & 7) === 0 ? 0.75 : 1;
        return pk(214 * k, 218 * k, 224 * k);
      });
      if (hz) {
        rect(x0 - 0.4, y0, x0 - 0.3, y1, null, pk(200, 204, 210));
        rect(x1 + 0.3, y0, x1 + 0.4, y1, null, pk(200, 204, 210));
        rect(x0, y0 - 0.66, x1, y0 - 0.3, M.tatil);
        rect(x0, y1 + 0.3, x1, y1 + 0.66, M.tatil);
      } else {
        rect(x0, y0 - 0.4, x1, y0 - 0.3, null, pk(200, 204, 210));
        rect(x0, y1 + 0.3, x1, y1 + 0.4, null, pk(200, 204, 210));
        rect(x0 - 0.66, y0, x0 - 0.3, y1, M.tatil);
        rect(x1 + 0.3, y0, x1 + 0.66, y1, M.tatil);
      }
    });
    // ônibus: faixa amarela no ponto da avenida
    rect(AV.ce - 1.2, BUS.y0 - 0.8, AV.ce - 1.1, BUS.y1 + 0.8, null, yellow);
    // bueiros
    [[9.0, 40.8], [36.0, 39.2], [21.0, 41.0], [29.0, 60.4], [32.0, 70.0], [46.0, 59.0], [29.4, 47.2]].forEach(([mx, my]) => {
      each(mx - 0.32, my - 0.32, mx + 0.32, my + 0.32, (wx, wy) => {
        const d2 = (wx - mx) * (wx - mx) + (wy - my) * (wy - my);
        if (d2 >= 0.1024) return -1;
        if (d2 > 0.0784) return pk(20, 22, 28);
        return (Math.floor(wx * 16) + Math.floor(wy * 16)) % 3 ? pk(52, 54, 62) : pk(30, 32, 38);
      });
    });
    // tapetinho de mármore na entrada do seu prédio
    const acc = Hub.rgbOf(th.acc);
    each(GAP0, FN0, GAP1, FN1, (wx, wy, gx, gy) => {
      if (wy > 36.41 && wy < 36.49) return pk(acc[0], acc[1], acc[2]);
      const n = ((((Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 8) & 15) - 7);
      return pk(70 + n, 62 + n, 58 + n);
    });
    yield;
    // 4) a quadra da praça: azul com borda de terra, linhas brancas
    const Q = COURT;
    const ix = Q.x0 + 0.4;
    const ax = Q.x1 - 0.4;
    const iy = Q.y0 + 0.4;
    const ay = Q.y1 - 0.4;
    const qcx = (Q.x0 + Q.x1) / 2;
    const qcy = (Q.y0 + Q.y1) / 2;
    const ln = 0.045;
    each(Q.x0, Q.y0, Q.x1, Q.y1, (wx, wy, gx, gy) => {
      const n = ((((Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 8) & 15) - 7);
      let line = false;
      if ((Math.abs(wx - ix) < ln || Math.abs(wx - ax) < ln) && wy > iy - ln && wy < ay + ln) line = true;
      else if ((Math.abs(wy - iy) < ln || Math.abs(wy - ay) < ln) && wx > ix - ln && wx < ax + ln) line = true;
      else if (Math.abs(wx - qcx) < ln && wy > iy && wy < ay) line = true;
      else {
        const dy = wy - qcy;
        const dc = Math.sqrt((wx - qcx) * (wx - qcx) + dy * dy);
        const d1 = Math.sqrt((wx - ix) * (wx - ix) + dy * dy);
        const d2 = Math.sqrt((wx - ax) * (wx - ax) + dy * dy);
        if (Math.abs(dc - 0.9) < ln || dc < 0.08 || Math.abs(d1 - 1.3) < ln || Math.abs(d2 - 1.3) < ln) line = true;
      }
      if (line) return pk(226, 232, 240);
      if (wx > ix && wx < ax && wy > iy && wy < ay) return pk(30 + n, 64 + n, 150 + n);
      return pk(150 + n, 70 + n, 40 + n);
    });
    yield;
    // 5) o parque: caminhos de saibro, pista em volta do lago, beira de pedra, água, canteiros
    // de flores e a areia do parquinho
    rect(5.5, FENCE_Y + 0.08, 6.5, 67.0, M.terra);
    rect(17.0, FENCE_Y + 0.08, 18.0, 66.7, M.terra);
    rect(20.6, 70.7, 25.4, 71.7, M.terra);
    rect(21.2, 67.2, 22.2, 70.8, M.terra);
    ell(TRACK.x, TRACK.y, TRACK.rx + TRACK.hw, TRACK.ry + TRACK.hw, M.terra, TRACK.rx - TRACK.hw, TRACK.ry - TRACK.hw);
    ell(LAKE.x, LAKE.y, LAKE.rx + 0.3, LAKE.ry + 0.3, M.pedra, LAKE.rx, LAKE.ry);
    ell(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, M.agua);
    [[3.4, 65.7, 1.0, 0.6], [14.2, 64.95, 0.9, 0.38], [5.4, 71.2, 0.6, 1.2], [18.6, 71.2, 0.6, 1.2], [22.2, 75.0, 1.1, 0.8]].forEach(([x, y, rx, ry]) => ell(x, y, rx, ry, M.flores));
    rect(1.6, 74.3, 5.4, 77.9, M.areia);
    return paint;
  };

  // ---------------------------------------------------------------- minimapa
  const asphaltAt = (x, y) => (y > CURB_N && y < CURB_S && x > 1 && x < STREET_X1) || (x > AV.cw && x < AV.ce && y > CURB_S && y < AV.end) || (x > AV.ce && x < 60.4 && y > R2.cn && y < R2.cs);
  C.miniColor = (id, x, y) => {
    if (id === 'portaria') return '#57534e';
    if (!OUT_AREAS[id]) return null;
    const cx = x + 0.5;
    const cy = y + 0.5;
    if (id === 'praca' && cx > COURT.x0 && cx < COURT.x1 && cy > COURT.y0 && cy < COURT.y1) return '#1e40af';
    if (id === 'parque' || (id === 'comercio' && cy > FENCE_Y)) {
      if (((cx - LAKE.x) / LAKE.rx) ** 2 + ((cy - LAKE.y) / LAKE.ry) ** 2 < 1) return '#2563eb';
      const dt = Math.sqrt(((cx - TRACK.x) / TRACK.rx) ** 2 + ((cy - TRACK.y) / TRACK.ry) ** 2);
      if (Math.abs(dt - 1) < 0.09) return '#a16207';
      if (cx > 20.4 && cy < 67.2) return '#78716c';
      return '#166534';
    }
    if (asphaltAt(cx, cy)) return ZEBRAS.some(([x0, y0, x1, y1]) => cx > x0 - 0.2 && cx < x1 + 0.2 && cy > y0 - 0.2 && cy < y1 + 0.2) ? '#64748b' : '#1f2937';
    if (id === 'comercio') return '#7c6a58';
    return '#475569';
  };
  C.miniMarks = (g, K) => {
    // banca (verde), telão (cor do clube), ônibus (azul), metrô (M azul), lanchonete (amarelo),
    // megaloja (cor do clube) e o chafariz
    const th = Hub._3d && Hub._3d.World.th;
    const acc = (th && th.acc) || '#facc15';
    const dot = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x * K), Math.round(y * K), w, h);
    };
    dot(BANCA.x0, BANCA.y0, 6, 3, '#22c55e');
    dot(BOARD.x0, BOARD.y0, 3, 15, acc);
    dot(AV.e0 - 0.8, BUS.y0, 3, 8, '#60a5fa');
    METRO.forEach((m) => {
      dot(m.x0, m.y0, 5, 5, '#1d4ed8');
      dot(m.x0 + 0.33, m.y0 + 0.33, 3, 3, '#f8fafc');
    });
    dot(LANCHE.x0, LANCHE.y0 - 0.3, 11, 2, '#facc15');
    dot(36.5, 55.2, 24, 2, acc);
    dot(LAKE.x - 0.34, LAKE.y - 0.34, 2, 2, '#e0f2fe');
  };
  C.miniPeds = (g, K, hub) => {
    if (!C.inCity(hub.area) || !ACTIVE.length) return;
    ACTIVE.forEach((p) => {
      g.fillStyle = p.fan && p.seen ? '#f472b6' : '#cbd5e1';
      g.fillRect(Math.floor(p.x * K) - 1, Math.floor(p.y * K) - 1, 2, 2);
    });
  };

  // ================================================================ GENTE DA RUA
  // rotas das calçadas (pontos em ordem; o pedestre anda em volta, sem parar; atravessa as
  // ruas nas faixas de pedestre)
  const ellRoute = (cx, cy, rx, ry, n) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);
  const ROUTES = {
    // rua da vitória: quarteirão pequeno (faixa da frente do prédio e a do café)
    block: [[13.5, 37.05], [23.4, 37.05], [23.4, 42.35], [13.5, 42.35]],
    // volta grande: calçada de cima para o oeste, atravessa no fim, a de baixo para o leste
    // (passa a boca da avenida na faixa) e volta pelo calçadão da praça (sem asfalto)
    big: [[44.2, 37.75], [2.4, 37.75], [2.4, 42.95], [44.2, 42.95]],
    // volta em torno da quadra
    plaza: [[46.2, 38.0], [46.2, 43.45], [57.75, 43.45], [57.75, 36.76], [46.6, 36.76]],
    // avenida: desce pela calçada oeste, atravessa depois do cruzamento, sobe pela leste
    avenue: [[27.25, 42.95], [27.25, 64.8], [34.1, 64.8], [34.1, 42.95]],
    // calçadão: em volta da faixa do meio
    calcadao: [[3.6, 57.6], [24.4, 57.6], [24.4, 62.7], [3.6, 62.7]],
    // rua das torres: as duas calçadas, atravessando nas faixas das pontas
    torres: [[34.1, 56.6], [58.9, 56.6], [58.9, 62.4], [34.1, 62.4]],
    // parque: a pista em volta do lago
    pista: ellRoute(TRACK.x, TRACK.y, TRACK.rx, TRACK.ry, 32),
    // parque: entra pelo portão do oeste, segue a pista por cima e sai pelo arco
    passeio: [[6.0, 62.2], [6.0, 66.7], [9.0, 65.9], [12.0, 65.5], [15.0, 65.9], [17.5, 66.9], [17.5, 62.2]]
  };
  const routeLen = {};
  Object.keys(ROUTES).forEach((k) => {
    const R0 = ROUTES[k];
    let L = 0;
    for (let i = 0; i < R0.length; i++) {
      const a = R0[i];
      const b = R0[(i + 1) % R0.length];
      L += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    routeLen[k] = L;
  });
  // ponto (x, y) e direção a uma distância s ao longo da rota
  function along(k, s) {
    const R0 = ROUTES[k];
    let d = ((s % routeLen[k]) + routeLen[k]) % routeLen[k];
    for (let i = 0; i < R0.length; i++) {
      const a = R0[i];
      const b = R0[(i + 1) % R0.length];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= l) {
        const t = d / l;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
      }
      d -= l;
    }
    return [R0[0][0], R0[0][1], 0];
  }

  // quem está na rua (sempre as mesmas pessoas: a aparência sai de uma semente)
  const HAIRS = ['isagi', 'spiky_tall', 'nagi_fluffy', 'hugo_wavy', 'parted_glasses', 'anri_bob', 'chigiri_long', 'reo_bun', 'bunny_messy', 'lorenzo_wavy', 'aiku_messy', 'ego_bob', 'sae_spiky', 'rin_fringe'];
  const SKINS = ['#fde7d6', '#f3d1b8', '#e5b899', '#c99472', '#a26a47', '#7a4a2e', '#5a3622'];
  const HAIRC = ['#0f0f10', '#1c1917', '#3f2a1d', '#5b3a1e', '#78350f', '#a16207', '#d6b370', '#57534e', '#9ca3af', '#7c2d12'];
  const CLOTHES = ['#334155', '#7f1d1d', '#1e3a8a', '#14532d', '#78350f', '#4c1d95', '#0f766e', '#be185d', '#a16207', '#e5e7eb', '#0f172a', '#c2410c'];
  // k = walk (rota r, posição s, velocidade v) | jog | kidwalk (criança andando junto) |
  // stand / sit (lugar at = [x, y, ângulo]; seat = altura do assento) | kid (pelada na quadra;
  // play = no parquinho). dia = só de manhã e de tarde; jersey = de camisa do seu clube (fã);
  // role = porteiro / lanche (atendente) / vendedor (pipoca, sorvete); dog = com cachorro
  const PI = Math.PI;
  const CAST = [
    // rua da vitória e praça
    { k: 'walk', r: 'block', s: 0, v: 0.021 },
    { k: 'walk', r: 'block', s: 23, v: 0.024 },
    { k: 'walk', r: 'big', s: 4, v: 0.022, jersey: 1 },
    { k: 'walk', r: 'big', s: 46, v: 0.025 },
    { k: 'walk', r: 'big', s: 88, v: 0.02 },
    { k: 'walk', r: 'plaza', s: 3, v: 0.019 },
    { k: 'walk', r: 'plaza', s: 22, v: 0.023, jersey: 1 },
    { k: 'stand', at: [15.4, 33.6, PI], role: 'porteiro' }, // atrás do balcão da portaria
    { k: 'stand', at: [19.85, 42.62, PI / 2 + 0.3] }, // lendo as revistas da banca
    { k: 'sit', at: [45.52, 38.32, 0] }, // no banco da praça, vendo a pelada
    { k: 'sit', at: [45.52, 38.92, 0] },
    { k: 'kid', at: [49.3, 38.8] },
    { k: 'kid', at: [50.0, 41.4] },
    { k: 'kid', at: [54.4, 38.9] },
    { k: 'kid', at: [54.9, 41.2] },
    // avenida
    { k: 'walk', r: 'avenue', s: 0, v: 0.022 },
    { k: 'walk', r: 'avenue', s: 19, v: 0.024, jersey: 1 },
    { k: 'sit', at: [35.07, 48.0, PI] }, // no banco do ponto de ônibus
    { k: 'stand', at: [34.4, 50.7, PI] }, // esperando o ônibus
    { k: 'stand', at: [26.3, 47.4, -PI / 2 + 0.4] }, // saiu do metrô, olhando o celular
    // calçadão
    { k: 'walk', r: 'calcadao', s: 0, v: 0.02 },
    { k: 'walk', r: 'calcadao', s: 13, v: 0.023 },
    { k: 'walk', r: 'calcadao', s: 31, v: 0.021, jersey: 1 },
    { k: 'stand', at: [8.0, 55.76, PI / 2], role: 'lanche', lift: 0.16 }, // atendente da lanchonete (num degrau atrás do balcão)
    { k: 'stand', at: [7.2, 56.85, -PI / 2] }, // cliente no balcão
    { k: 'sit', at: [9.3, 56.7, -PI / 2], seat: 0.64 }, // no banquinho
    { k: 'sit', at: [14.94, 56.55, 0], seat: 0.42 }, // mesas da cantina
    { k: 'sit', at: [16.06, 56.55, PI], seat: 0.42 },
    { k: 'sit', at: [17.86, 56.55, PI], seat: 0.42 },
    { k: 'sit', at: [18.54, 56.55, 0], seat: 0.42 },
    { k: 'sit', at: [19.66, 56.55, PI], seat: 0.42 },
    { k: 'stand', at: [8.6, 60.15, -PI / 2], role: 'vendedor' }, // pipoqueiro
    { k: 'sit', at: [6.2, 59.15, PI / 2] }, // bancos do calçadão
    { k: 'sit', at: [17.0, 59.85, -PI / 2] },
    // rua das torres: os fãs de camisa esperando na porta da megaloja
    { k: 'walk', r: 'torres', s: 0, v: 0.022 },
    { k: 'walk', r: 'torres', s: 21, v: 0.025 },
    { k: 'stand', at: [37.6, 55.95, -PI / 2 + 0.2], jersey: 1 },
    { k: 'stand', at: [38.35, 56.05, -PI / 2 - 0.4], jersey: 1 },
    { k: 'stand', at: [39.1, 55.9, -PI / 2 + 0.4], jersey: 1 },
    { k: 'stand', at: [39.85, 56.0, -PI / 2], jersey: 1, small: 1 },
    // parque
    { k: 'jog', r: 'pista', s: 0, v: 0.045 },
    { k: 'walk', r: 'pista', s: 14, v: 0.017, dog: 1 }, // passeando com o cachorro
    { k: 'walk', r: 'passeio', s: 0, v: 0.019 },
    { k: 'sit', at: [12.0, 64.32, PI / 2] }, // bancos do parque
    { k: 'sit', at: [1.78, 71.2, 0] },
    { k: 'sit', at: [12.0, 78.18, -PI / 2] },
    { k: 'stand', at: [20.2, 76.2, -PI / 2], role: 'vendedor' }, // sorveteiro
    { k: 'stand', at: [7.6, 69.2, -0.8] }, // um casal na beira do lago
    { k: 'stand', at: [7.95, 68.85, 2.3] },
    { k: 'kid', at: [3.3, 75.9], play: 1 }, // parquinho
    { k: 'kid', at: [4.6, 76.0], play: 1 },
    // só de dia (manhã e fim de tarde): mais gente na rua
    { k: 'walk', r: 'block', s: 10, v: 0.022, dia: 1 },
    { k: 'kidwalk', r: 'block', s: 9.35, v: 0.022, dia: 1 }, // a criança andando junto com o adulto da frente
    { k: 'walk', r: 'big', s: 25, v: 0.023, dia: 1 },
    { k: 'walk', r: 'big', s: 66, v: 0.021, dia: 1 },
    { k: 'jog', r: 'big', s: 105, v: 0.046, dia: 1 }, // correndo de manhã
    { k: 'walk', r: 'plaza', s: 13, v: 0.02, dia: 1 },
    { k: 'stand', at: [23.95, 43.3, 0], dia: 1 }, // conversando na porta do café
    { k: 'stand', at: [24.6, 43.3, PI], dia: 1 },
    { k: 'walk', r: 'avenue', s: 37, v: 0.021, dia: 1 },
    { k: 'jog', r: 'avenue', s: 8, v: 0.044, dia: 1 },
    { k: 'walk', r: 'calcadao', s: 22, v: 0.02, dia: 1 },
    { k: 'kidwalk', r: 'calcadao', s: 21.4, v: 0.02, dia: 1 },
    { k: 'stand', at: [9.35, 58.8, PI / 2 + 0.5], dia: 1 }, // comprando pipoca
    { k: 'walk', r: 'torres', s: 42, v: 0.02, dia: 1 },
    { k: 'jog', r: 'pista', s: 22, v: 0.05, dia: 1 },
    { k: 'walk', r: 'pista', s: 33, v: 0.018, dia: 1 },
    { k: 'walk', r: 'passeio', s: 12, v: 0.018, dia: 1 },
    { k: 'kidwalk', r: 'passeio', s: 11.4, v: 0.018, dia: 1 },
    { k: 'stand', at: [20.2, 74.95, PI / 2], dia: 1 } // comprando sorvete
  ];
  const PEDS = [];
  const PETS = []; // cachorro, patos e pombos
  let BALL = null;
  let built = false;
  function build() {
    built = true;
    PEDS.length = 0;
    CAST.forEach((c, i) => {
      const q = Math.floor(rnd01(i, 3) * 1e6);
      // (kid = joga na quadra ou no parquinho; small = criança (menor); jog = correndo)
      const kid = c.k === 'kid';
      const small = kid || c.k === 'kidwalk' || !!c.small;
      const kind = c.k === 'kidwalk' || c.k === 'jog' ? 'walk' : c.k;
      // alguns torcedores usam a camisa do seu clube (com o seu número)
      const jersey = !!c.jersey;
      const cd = {
        name: 'pedestre' + i,
        skinColor: SKINS[q % SKINS.length],
        hairColor: HAIRC[(q >> 3) % HAIRC.length],
        hairSecondary: HAIRC[(q >> 6) % HAIRC.length],
        eyeColor: '#1e293b',
        hairStyle: HAIRS[(q >> 4) % HAIRS.length],
        outfit: jersey ? 'kit' : 'casual',
        clothesColor: CLOTHES[(q >> 2) % CLOTHES.length],
        jerseyPrimary: '#0f2942',
        jerseySecondary: '#1d4ed8',
        number: 2 + (q % 30)
      };
      if (c.role === 'porteiro') {
        cd.outfit = 'suit';
        cd.hairColor = '#9ca3af';
        cd.hairStyle = 'parted_glasses';
      }
      if (c.role === 'lanche') cd.clothesColor = '#dc2626';
      if (c.role === 'vendedor') cd.clothesColor = '#f8fafc';
      if (!small && (q >> 9) % 7 === 0) cd.hat = 'beanie';
      const p = { id: 'ped' + i, i, slot: 300 + i, kind, cd, jersey, role: c.role || '', porter: c.role === 'porteiro', vendor: c.role === 'lanche' || c.role === 'vendedor', kid, court: kid && !c.play, play: !!c.play, small, jog: c.k === 'jog', dayOnly: !!c.dia, seat: c.seat, dog: !!c.dog, lift: c.lift || 0, x: 0, y: 0, ang: 0, anim: 'idle', st: 'walk', t0: 0, ph: (q >> 5) % 97, k: small ? 0.66 : 0.9 };
      if (kind === 'walk') {
        p.route = c.r;
        p.s = c.s;
        p.spd = c.v;
        const [x, y, ang] = along(c.r, c.s);
        Object.assign(p, { x, y, ang, anim: p.jog ? 'run' : 'walk' });
      } else {
        p.hx = c.at[0];
        p.hy = c.at[1];
        p.x = c.at[0];
        p.y = c.at[1];
        p.ang = c.at[2] || 0;
        p.ang0 = p.ang;
        p.anim = kind === 'sit' ? 'sit' : kid ? 'run' : 'idle';
        p.st = 'idle';
      }
      PEDS.push(p);
    });
    BALL = { id: 'bola', ball: true, noTalk: true, ghostSolid: true, x: 52, y: 40, z: 0.05, k: 1, shadow: 0.08 };
    // bichos
    PETS.length = 0;
    PEDS.filter((p) => p.dog).forEach((p) => PETS.push({ id: 'cao' + p.i, pet: 'dog', owner: p, x: p.x, y: p.y, ang: 0, noTalk: true, ghostSolid: true, k: 1, shadow: 0.12 }));
    [0, 2.2, 4.1].forEach((a, i) => PETS.push({ id: 'pato' + i, pet: 'duck', a, x: LAKE.x, y: LAKE.y, ang: 0, noTalk: true, ghostSolid: true, k: 1, shadow: 0 }));
    [[11.2, 58.95], [11.8, 59.0], [12.3, 58.85], [12.0, 60.25], [12.7, 60.1]].forEach(([x, y], i) => PETS.push({ id: 'pombo' + i, pet: 'pigeon', hx: x, hy: y, x, y, z: 0, ang: i * 1.7, fly: 0, gone: 0, noTalk: true, ghostSolid: true, k: 1, shadow: 0.05 }));
  }

  // reconhecer: quem é fã (depende da fama) e o que pede (autógrafo, selfie, bola)
  const ACTIVE = []; // quem está na rua agora (de noite tem menos gente)
  function recast() {
    const f = fame();
    const night = C.mode() === 'noite';
    const th = Hub._3d && Hub._3d.World && Hub._3d.World.th;
    ACTIVE.length = 0;
    PEDS.forEach((p) => {
      if (!(night && p.dayOnly)) ACTIVE.push(p);
      // quem é torcedor veste a camisa do SEU clube, com o seu número
      if (p.jersey && th && p.cd.jerseyPrimary !== th.acc) {
        p.cd.jerseyPrimary = th.acc;
        p.cd.jerseySecondary = th.acc2;
        p.cd.number = prof().number || 10;
      }
      p.fan = !p.vendor && (p.porter || p.jersey || rnd01(p.i, 11) < (p.small ? Math.min(0.95, f + 0.2) : f));
      p.req = p.porter ? 'oi' : p.small ? (rnd01(p.i, 17) < 0.6 ? 'bola' : 'selfie') : rnd01(p.i, 19) < 0.5 ? 'auto' : 'selfie';
      p.seen = false;
      p.done = false;
      p.said = false;
      p.line = '';
      p.st = p.kind === 'walk' ? 'walk' : 'idle';
    });
  }

  // falas
  function fanLine(p) {
    const s = App().state || {};
    const ach = s.unlockedAchievements || [];
    const club = clubOf();
    const nm = meName();
    const sn = meShirt();
    const L = [`É o ${nm}?!`, `${sn}!! Não acredito!`, `Você é o camisa ${prof().number || 10}${club ? ' do ' + club.name : ''}!`];
    if (ach.includes('ach_four_egos') || ach.includes('ach_world_cup') || ach.includes('ach_u20_win')) L.push('Que golaço naquela final!');
    if (ach.includes('ach_ballon_dor')) L.push('O dono da Bola de Ouro aqui no bairro!');
    if ((s.careerGoals || 0) >= 10) L.push(`${s.careerGoals} gols... você é um monstro!`);
    if (p.jersey) L.push('Olha a minha camisa: é a sua!');
    if (p.small) L.push(`${sn}!!! Eu quero ser igual a você!`);
    if (p.kind === 'sit' && p.seat) L.push('Para tudo! O craque aqui na cantina!');
    const first = L[Math.floor(rnd01(p.i, 23 + (Hub.t >> 9)) * L.length)];
    const ask = { auto: 'Me dá um autógrafo?', selfie: 'Posso tirar uma selfie?', bola: 'Assina a minha bola?!', oi: 'O prédio inteiro viu o seu jogo!' }[p.req];
    const hi = C.mode() === 'noite' ? 'Boa noite' : C.mode() === 'tarde' ? 'Boa tarde' : 'Bom dia';
    return p.porter ? `${hi}, ${sn}! ${ask}` : `${first} ${ask}`;
  }
  const NOPE = ['Quem é esse?', 'Hm? Acho que já vi essa cara...', 'Com licença!', '(olhando o celular)', 'Opa, desculpa.'];
  const HELLO = { lanche: 'Olha o craque! Vai um Lanche do Craque? Recarrega pro treino!', vendedor: 'Fresquinho! Quer um?' };
  const HINT = { auto: 'E: dar autógrafo', selfie: 'E: tirar selfie', bola: 'E: assinar a bola' };
  const who = (p) => (p.porter ? 'PORTEIRO' : p.role === 'lanche' ? 'ATENDENTE' : p.vendor ? 'VENDEDOR' : p.small ? 'CRIANÇA' : p.jersey ? 'TORCEDOR' : p.fan ? 'FÃ' : 'PEDESTRE');
  function say(hub, p, text, o = {}) {
    hub.bubble = Object.assign({ npc: p.id, who: who(p), text, hint: '', fan: p.fan, until: hub.t + 200 }, o);
  }

  // quadro de animação no começo do quadro atual (a textura só muda quando o quadro muda)
  const CUM = new Map();
  function animFrame(anim, view, t) {
    const A = window.SPRITE_ANIMS || {};
    let name = anim;
    if (anim === 'walk') name = view === 'front' ? 'walkFB' : view === 'back' ? 'walkB' : 'walk';
    if (anim === 'run') name = view === 'front' ? 'runFB' : view === 'back' ? 'runB' : 'run';
    const an = A[name] || A[anim];
    if (!an) return Math.floor(t / 4) * 4;
    let c = CUM.get(name);
    if (!c) {
      let acc = 0;
      c = an.frames.map((f) => (acc += f.d || 6) - (f.d || 6));
      c.total = acc;
      CUM.set(name, c);
    }
    const base = t - (t % c.total);
    const r = t % c.total;
    let st = 0;
    for (let i = 0; i < c.length; i++) if (c[i] <= r) st = c[i];
    return base + st;
  }
  // de onde a câmera vê o pedestre (para escolher o quadro de frente/lado/costas)
  function viewOf(hub, p) {
    const cam = hub.cam3 || { x: hub.px, y: hub.py };
    let rel = Math.atan2(cam.y - p.y, cam.x - p.x) - p.ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    return Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side';
  }
  // dá para ver daqui? (perto, ou com a linha até ele sem quarteirão maciço no meio)
  function visible(hub, x, y) {
    const dx = x - hub.px;
    const dy = y - hub.py;
    const d2 = dx * dx + dy * dy;
    if (d2 < 9) return true;
    if (d2 > 24 * 24) return false;
    const X = Hub._3d;
    const m = X.World.map;
    const MW = X.C.MW;
    const n = Math.ceil(Math.sqrt(d2) / 0.45);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (m.solid[((hub.py + dy * t) | 0) * MW + ((hub.px + dx * t) | 0)]) return false;
    }
    return true;
  }

  // um passo da rua (uma vez por tique do mapa)
  let lastT = -1;
  let kt = 0; // relógio da pelada (para quando você entra na quadra)
  let visit = 0;
  let CH = null; // o desafio da criançada (quando está valendo)
  function stepPeds(hub) {
    const t = hub.t;
    if (t === lastT) return;
    const dt = lastT < 0 ? 1 : Math.max(1, Math.min(4, t - lastT));
    lastT = t;
    const px = hub.px;
    const py = hub.py;
    const Q = COURT;
    const inCourt = px > Q.x0 && px < Q.x1 && py > Q.y0 && py < Q.y1;
    if (!inCourt) kt += dt;
    let talk = null; // o fã mais perto que está falando com você
    let talkD = 9;
    ACTIVE.forEach((p) => {
      const dx = px - p.x;
      const dy = py - p.y;
      const d = Math.hypot(dx, dy);
      const toMe = Math.atan2(dy, dx);
      if (CH && p.court) return; // (no desafio quem mexe nas crianças da quadra é o desafio)
      // reconheceu agora: para, vira para você e acena
      if (p.fan && !p.seen && d < (p.porter ? 3.2 : 3.1) && (!p.court || inCourt || d < 2.2)) {
        p.seen = true;
        p.st = 'notice';
        p.t0 = t;
        p.line = fanLine(p);
        p.hint = HINT[p.req] || 'E: conversar';
        say(hub, p, p.line, { hint: p.hint, fan: true });
        window.SFX?.blip?.(p.kid ? 1100 : 760);
      } else if (!p.fan && !p.said && d < (p.vendor ? 2.4 : 1.7)) {
        p.said = true;
        if (!hub.bubble || hub.bubble.npc === p.id || d < 1.2) say(hub, p, p.vendor ? HELLO[p.role] : NOPE[(p.i + visit) % NOPE.length], { until: t + (p.vendor ? 220 : 150) });
      }
      if (p.st === 'notice' || p.st === 'wait' || p.st === 'happy') {
        p.ang = toMe;
        // (quem está sentado continua sentado: só o balão comemora)
        if (p.st === 'happy') p.anim = p.kind === 'sit' ? 'sit' : t - p.t0 < 70 ? 'celebrate' : 'idle';
        else p.anim = p.kind === 'sit' ? 'sit' : t - p.t0 < 90 ? 'call' : 'idle';
        if (p.st === 'happy' && t - p.t0 >= 70) p.st = 'wait';
        if (p.st === 'notice' && t - p.t0 > 90) p.st = 'wait';
        // (quem fala é quem está mais perto e na sua frente: o mesmo que o E atende)
        let da = Math.atan2(-dy, -dx) - hub.ang;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        const score = d + (da > 1.0 && d > 0.5 ? 4 : da * 0.7);
        if (score < talkD && (p.st !== 'happy' || hub.bubble?.npc === p.id)) {
          talkD = score;
          talk = p;
        }
        // você foi embora: volta ao que estava fazendo
        if (d > 4.6 && t - p.t0 > 60) {
          p.st = p.kind === 'walk' ? 'walk' : 'idle';
          if (p.kind !== 'walk') p.ang = p.ang0 !== undefined ? p.ang0 : p.ang;
        }
        return;
      }
      if (p.kind === 'walk') {
        p.s += p.spd * dt;
        const [x, y, ang] = along(p.route, p.s);
        p.x = x;
        p.y = y;
        // vira devagar nas esquinas
        let da = ang - p.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        p.ang += da * 0.25;
        p.anim = p.jog ? 'run' : 'walk';
      } else if (p.kid) {
        // pelada (quadra) ou pega-pega (parquinho): cada um corre em volta do seu lugar
        const w = kt * (p.play ? 0.017 : 0.021) + p.ph;
        const amp = p.play ? 0.55 : 1.1;
        const nx = p.hx + Math.sin(w) * amp;
        const ny = p.hy + Math.sin(w * 1.37 + 1) * amp * 0.5;
        if (!p.court || !inCourt) {
          const ang = Math.atan2(ny - p.y, nx - p.x);
          if (Math.hypot(nx - p.x, ny - p.y) > 0.002) p.ang = ang;
          p.x = nx;
          p.y = ny;
          p.anim = 'run';
        } else {
          p.ang = toMe;
          p.anim = 'idle';
        }
      } else {
        p.anim = p.kind === 'sit' ? 'sit' : 'idle';
        // quem está parado olha para você quando você chega perto
        if (d < 2.4) p.ang = toMe;
        else if (p.ang0 !== undefined) p.ang = p.ang0;
      }
    });
    // a bola: de um menino para o outro (passes em arco); parada se você entrou na quadra
    const kids = PEDS.filter((p) => p.court);
    if (CH) stepChallenge(hub, kids, dt);
    else if (kids.length && !inCourt) {
      const PASS = 64;
      const n = Math.floor(kt / PASS);
      const f = (kt % PASS) / PASS;
      const order = [0, 2, 1, 3];
      const a = kids[order[n % 4]];
      const b = kids[order[(n + 1) % 4]];
      BALL.x = a.x + (b.x - a.x) * f;
      BALL.y = a.y + (b.y - a.y) * f;
      BALL.z = 0.05 + Math.sin(Math.PI * f) * 0.35;
    } else if (BALL) BALL.z = 0.05;
    stepPets(hub, dt);
    // o balão fica com o fã mais perto enquanto você está do lado dele (dois fãs juntos: fala
    // quem está mais perto, que é quem o E vai atender)
    if (talk && talkD < 4.2 && !CH) {
      const cur = hub.bubble && ACTIVE.find((q) => q.id === hub.bubble.npc);
      const busy = cur && cur !== talk && cur.st === 'happy';
      if (!busy && cur !== talk && !talk.done && talk.st !== 'happy' && talk.line) say(hub, talk, talk.line, { hint: talk.hint, fan: true });
      if (hub.bubble && hub.bubble.npc === talk.id) hub.bubble.until = Math.max(hub.bubble.until, t + 30);
    }
  }

  // ---------------------------------------------------------------- bichos (texturas pequenas)
  const PETTEX = {};
  function petTex(name) {
    if (PETTEX[name]) return PETTEX[name];
    const X = Hub._3d;
    const R = (g, x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    // desenha virado para a direita; 'L' no fim = espelhado
    const flip = name.endsWith('L');
    const base = flip ? name.slice(0, -1) : name;
    const [kind, view, fr] = base.split('_');
    const W = kind === 'dog' ? 30 : kind === 'duck' ? 20 : 14;
    const Hh = kind === 'dog' ? 24 : kind === 'duck' ? 16 : 12;
    const t = X.makeTex(W, Hh, (g) => {
      if (flip) {
        g.translate(W, 0);
        g.scale(-1, 1);
      }
      const f = Number(fr || 0);
      if (kind === 'dog') {
        // cachorro caramelo
        const c = '#c2803a';
        const d = '#8a5a26';
        if (view === 'side') {
          R(g, 6, 9, 16, 7, c);
          R(g, 20, 4, 7, 7, c);
          R(g, 26, 7, 3, 3, '#3f2a1d');
          R(g, 20, 2, 3, 4, d);
          R(g, 24, 6, 1, 1, '#111');
          R(g, 2, 7, 5, 2, c);
          R(g, 1, 5, 2, 3, c);
          const k = f ? 2 : 0;
          R(g, 7 + k, 16, 2, 6, d);
          R(g, 11 - k, 16, 2, 6, c);
          R(g, 17 + k, 16, 2, 6, d);
          R(g, 20 - k, 16, 2, 6, c);
          R(g, 6, 15, 16, 1, d);
        } else {
          R(g, 10, 8, 10, 9, c);
          R(g, 10, 3, 10, 7, c);
          R(g, 9, 2, 3, 5, d);
          R(g, 18, 2, 3, 5, d);
          if (view === 'front') {
            R(g, 12, 5, 1, 1, '#111');
            R(g, 17, 5, 1, 1, '#111');
            R(g, 14, 7, 2, 2, '#3f2a1d');
          } else R(g, 14, 0, 2, 4, c);
          R(g, 11, 17, 2, 6, f ? d : c);
          R(g, 17, 17, 2, 6, f ? c : d);
        }
      } else if (kind === 'duck') {
        // pato branco nadando (balança um pouco)
        const y0 = f ? 1 : 0;
        R(g, 3, 8 + y0, 12, 5, '#f8fafc');
        R(g, 2, 7 + y0, 3, 3, '#e2e8f0');
        R(g, 12, 3 + y0, 5, 5, '#f8fafc');
        R(g, 17, 5 + y0, 3, 2, '#f59e0b');
        R(g, 15, 4 + y0, 1, 1, '#111');
        R(g, 5, 9 + y0, 6, 2, '#cbd5e1');
        R(g, 1, 13, 18, 1, 'rgba(186,230,253,0.8)');
      } else {
        // pombo: bicando (f 0/1) ou voando (f 2/3)
        if (f < 2) {
          const y0 = f ? 2 : 0;
          R(g, 2, 5, 8, 5, '#64748b');
          R(g, 8, 2 + y0, 4, 4, '#475569');
          R(g, 12, 4 + y0, 2, 1, '#f59e0b');
          R(g, 9, 3 + y0, 1, 1, '#f8fafc');
          R(g, 0, 6, 3, 2, '#334155');
          R(g, 4, 10, 1, 2, '#f87171');
          R(g, 7, 10, 1, 2, '#f87171');
        } else {
          R(g, 3, 5, 8, 3, '#64748b');
          R(g, 10, 4, 3, 3, '#475569');
          if (f === 2) {
            R(g, 4, 0, 5, 5, '#94a3b8');
          } else R(g, 4, 8, 5, 3, '#94a3b8');
        }
      }
    });
    PETTEX[name] = t;
    return t;
  }
  function stepPets(hub, dt) {
    const t = hub.t;
    const cam = hub.cam3 || { x: hub.px, y: hub.py, a: hub.camA };
    const ca = cam.a !== undefined ? cam.a : hub.camA;
    const rX = -Math.sin(ca);
    const rY = Math.cos(ca);
    PETS.forEach((a) => {
      if (a.pet === 'dog') {
        const o = a.owner;
        // anda meio metro na frente do dono, puxando a coleira
        const [x, y, ang] = o.st === 'walk' ? along(o.route, o.s + 0.55) : [o.x + Math.cos(o.ang) * 0.5, o.y + Math.sin(o.ang) * 0.5, o.ang];
        const moving = Math.hypot(x - a.x, y - a.y) > 0.001;
        a.x = x;
        a.y = y;
        if (moving) a.ang = ang;
        let rel = Math.atan2(cam.y - a.y, cam.x - a.x) - a.ang;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const view = Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side';
        const f = moving ? Math.floor((t + o.ph) / 8) % 2 : 0;
        const left = Math.cos(a.ang) * rX + Math.sin(a.ang) * rY < 0;
        a.tex = petTex(`dog_${view}_${f}${view === 'side' && left ? 'L' : ''}`);
        a.z = 0;
      } else if (a.pet === 'duck') {
        // patos nadando devagar em volta do chafariz
        a.a += 0.0012 * dt;
        const nx = LAKE.x + Math.cos(a.a) * (LAKE.rx - 1.4);
        const ny = LAKE.y + Math.sin(a.a) * (LAKE.ry - 0.9);
        const vx = nx - a.x;
        const vy = ny - a.y;
        a.x = nx;
        a.y = ny;
        const left = vx * rX + vy * rY < 0;
        a.tex = petTex(`duck_side_${Math.floor((t + a.a * 50) / 40) % 2}${left ? 'L' : ''}`);
        a.z = 0;
      } else {
        // pombos: bicam o chão; você chega perto, eles voam e voltam depois
        const d = Math.hypot(hub.px - a.x, hub.py - a.y);
        if (!a.fly && d < 1.6) {
          a.fly = 1;
          a.t0 = t;
          a.vx = (a.x - hub.px) / Math.max(0.2, d);
          a.vy = (a.y - hub.py) / Math.max(0.2, d);
          if (d < 1.2) window.SFX?.noise?.('bandpass', 1800, 0.18, 0.05);
        }
        if (a.fly) {
          const k = t - a.t0;
          a.x += a.vx * 0.04 * dt;
          a.y += a.vy * 0.04 * dt;
          a.z = Math.min(3.2, k * 0.03);
          if (k > 110) {
            a.gone = 1;
            if (d > 7 && k > 900) {
              a.fly = 0;
              a.gone = 0;
              a.x = a.hx;
              a.y = a.hy;
              a.z = 0;
            }
          }
          a.tex = petTex(`pigeon_side_${2 + (Math.floor(k / 5) % 2)}${a.vx * rX + a.vy * rY < 0 ? 'L' : ''}`);
        } else {
          const f = Math.floor((t + a.ang * 40) / 22) % 3 === 0 ? 1 : 0;
          a.tex = petTex(`pigeon_side_${f}${Math.sin(a.ang + t * 0.002) < 0 ? 'L' : ''}`);
        }
      }
    });
  }

  // a lista que o motor desenha (pedestres + bichos + a bola), só o que dá para ver
  const OUT = [];
  const VIS = [];
  C.npcs = function (hub) {
    if (!built) build();
    // (ficou um tempo sem passar pela rua — voltou para casa, jogou uma partida: visita nova)
    if (lastT >= 0 && (hub.t - lastT > 900 || hub.t < lastT)) {
      visit++;
      CH = null;
    }
    if (hub._cityVisit !== visit) {
      // (cada visita à rua: os fãs de novo — a fama pode ter mudado)
      hub._cityVisit = visit;
      recast();
    }
    stepPeds(hub);
    OUT.length = 0;
    const t = hub.t;
    // (no máximo os 30 mais perto que dá para ver; os de longe mudam de quadro mais devagar:
    // cada quadro novo de um boneco é um desenho e um envio para a placa de vídeo)
    VIS.length = 0;
    ACTIVE.forEach((p) => {
      p._d = Math.hypot(p.x - hub.px, p.y - hub.py);
      if (p._d < 3 || (VIS.length < 60 && visible(hub, p.x, p.y))) VIS.push(p);
    });
    if (VIS.length > 30) VIS.sort((a, b) => a._d - b._d).length = 30;
    VIS.forEach((p) => {
      const view = viewOf(hub, p);
      p.frame = animFrame(p.anim, view, p._d > 12 ? t - (t % 10) + p.ph : t + p.ph);
      p.ghostSolid = p.kind === 'walk' || p.kid;
      p.ped = true;
      p.z = p.kind === 'sit' ? seatZ(p) : p.lift || 0;
      OUT.push(p);
    });
    PETS.forEach((a) => {
      if (a.gone || !a.tex || (a.pet === 'dog' && !ACTIVE.includes(a.owner))) return;
      if (visible(hub, a.x, a.y)) OUT.push(a);
    });
    if (BALL) {
      BALL.tex = BALL.tex || ballTex();
      if (visible(hub, BALL.x, BALL.y)) OUT.push(BALL);
    }
    if (t % 45 === 0) warmNear(hub);
    return OUT;
  };
  // altura do boneco sentado (assento a 0,42 no banco; p.seat nas cadeiras e banquinhos)
  function seatZ(p) {
    const P = PR();
    if (p._seat === undefined) {
      const u = P && P.spriteSeatU ? P.spriteSeatU(p.cd, 'sit') : null;
      const sz = p.seat || 0.42;
      p._seat = u === null || u === undefined ? sz - 0.24 : sz - (u * 2 * p.k) / 66;
    }
    return p._seat;
  }
  function ballTex() {
    const X = Hub._3d;
    const th = X.World.th;
    return X.propTex('ball', () => Hub.P.ball(0, 0), th) || null;
  }

  // ação E perto de um pedestre (js/hub3d.js: spots)
  C.spotOf = function (n, hub) {
    if (n.ball || n.pet || n.vendor || (CH && n.court)) return null;
    const h = 1.12 * (n.k / 0.9) + (n.z || 0);
    let label = 'CUMPRIMENTAR';
    if (n.fan && !n.done) label = n.porter ? 'FALAR COM O PORTEIRO' : n.req === 'auto' ? 'DAR AUTÓGRAFO' : n.req === 'bola' ? 'ASSINAR A BOLA' : 'TIRAR SELFIE';
    else if (n.fan) label = 'CONVERSAR';
    return { x: n.x, y: n.y, ped: n.id, npc: n.id, label, h };
  };

  // recompensa: +5 EgoCoins por fã (até 8 por capítulo, para não virar fazenda de moedas)
  const CAP = 8;
  function reward(kind) {
    const A = App();
    const s = A.state;
    if (!s) return '';
    const ch = s.currentChapterIndex;
    const m = s.fanMeets && s.fanMeets.ch === ch ? s.fanMeets : (s.fanMeets = { ch, n: 0, total: (s.fanMeets && s.fanMeets.total) || 0 });
    m.total = (m.total || 0) + 1;
    s.career = s.career || {};
    s.career[kind === 'selfie' ? 'selfies' : 'autographs'] = (s.career[kind === 'selfie' ? 'selfies' : 'autographs'] || 0) + 1;
    let msg;
    if (m.n < CAP) {
      m.n++;
      s.currencies.egoCoins += 5;
      msg = `+5 💠 EgoCoins (${m.n}/${CAP} neste capítulo)`;
    } else msg = 'os fãs adoraram! (as EgoCoins dos fãs deste capítulo já acabaram)';
    A.saveState?.();
    A.updateTopHeader?.();
    return msg;
  }
  // texto que sobe da cabeça do fã (✍️ / 📸)
  function pop(hub, p, html) {
    const cam = hub.cam3;
    // (sai de cima do balão do fã, para os dois não se taparem)
    const sc = cam && hub.toScreen(cam, p.x, p.y, 1.35 * ((p.k || 0.9) / 0.9) + 0.75);
    if (!sc || !hub.hud) return;
    const el = document.createElement('div');
    el.className = 'hub-pop';
    el.innerHTML = html;
    const uk = hub._uk || 1;
    el.style.left = `${Math.round(sc.x / uk)}px`;
    el.style.top = `${Math.round(sc.y / uk)}px`;
    hub.hud.appendChild(el);
    // (sai quando a animação acaba; o tempo é só a garantia)
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.isConnected && getComputedStyle(el).animationPlayState !== 'paused' && el.remove(), 4000);
  }
  function flash() {
    let el = document.querySelector('.hub-flash');
    if (!el) {
      el = document.createElement('div');
      el.className = 'hub-flash';
      document.body.appendChild(el);
    }
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    // clique da câmera do celular
    try {
      window.SFX?.noise?.('highpass', 3200, 0.07, 0.25);
      window.SFX?.tone?.('square', 1900, 1300, 0.05, 0.08);
    } catch (e) {}
  }
  const THANKS = { auto: ['Valeu!!! Vou emoldurar!', 'Não acredito! Obrigado!!'], bola: ['UAU! Ninguém da escola vai acreditar!', 'Valeu!! Agora ela é a bola mais valiosa do bairro!'], selfie: ['Ficou incrível! Vou postar agora!', 'Meus amigos não vão acreditar!'] };

  C.interact = function (hub, s) {
    const p = PEDS.find((x) => x.id === s.ped);
    if (!p) return;
    const sn = meShirt();
    if (!p.fan) {
      // quem não te conhece só responde
      say(hub, p, ['Ah... oi?', 'Desculpa, eu te conheço?', 'Olá!', 'Hm? Tá perdido?'][(p.i + hub.t) % 4], { until: hub.t + 160 });
      p.ang = Math.atan2(hub.py - p.y, hub.px - p.x);
      window.SFX?.blip?.(520);
      return;
    }
    if (p.done || p.req === 'oi') {
      say(hub, p, p.porter ? `Qualquer coisa é só chamar, ${sn}. ${C.mode() === 'noite' ? 'Boa noite' : 'Bom passeio'}!` : `Valeu de novo, ${sn}! Boa sorte no próximo jogo!`, { until: hub.t + 180 });
      window.SFX?.blip?.(880);
      if (p.porter) p.done = true;
      return;
    }
    p.done = true;
    p.seen = true;
    if (p.req === 'selfie') return selfie(hub, p);
    // autógrafo (ou a bola assinada): o fã pula de alegria
    p.st = 'happy';
    p.t0 = hub.t;
    const r = reward('auto');
    const th = THANKS[p.req] || THANKS.auto;
    say(hub, p, th[p.i % th.length], { hint: '', until: hub.t + 220 });
    pop(hub, p, p.req === 'bola' ? '⚽✍️ <b>BOLA ASSINADA!</b>' : '✍️ <b>AUTÓGRAFO!</b>');
    window.SFX?.page?.();
    window.SFX?.jingle?.([660, 880, 1320], 0.05);
    window.App?.notify?.(`✍️ ${p.req === 'bola' ? 'Você assinou a bola de uma criança' : 'Autógrafo para um fã'}: ${r}`, '#f472b6');
  };

  // selfie: a câmera vira para a frente de vocês dois, o fã levanta o celular e... flash
  function selfie(hub, p) {
    const X = Hub._3d;
    const W = X.World;
    // de que lado tem espaço para a câmera (de preferência o lado em que você olha)
    const free = (x, y) => !W.isSolid(Math.floor(x), Math.floor(y)) && !(W.bcell[Math.floor(y) * X.C.MW + Math.floor(x)] || []).some((id) => {
      const b = W.boxes[id];
      return b.solid && x > b.x0 - 0.15 && x < b.x1 + 0.15 && y > b.y0 - 0.15 && y < b.y1 + 0.15;
    });
    let dir = hub.ang;
    for (const k of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const a = hub.ang + k;
      let ok = true;
      for (let d = 0.4; d <= 2.3; d += 0.3) if (!free(hub.px + Math.cos(a) * d, hub.py + Math.sin(a) * d)) ok = false;
      if (ok) {
        dir = a;
        break;
      }
    }
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    // (direita da tela para quem olha de frente para vocês)
    const rx = fy;
    const ry = -fx;
    const sx = hub.px + rx * 0.62;
    const sy = hub.py + ry * 0.62;
    const mx = (hub.px + sx) / 2;
    const my = (hub.py + sy) / 2;
    // (quem aparece atrás: só quem está perto)
    const others = ACTIVE.filter((q) => q !== p && Math.hypot(q.x - hub.px, q.y - hub.py) < 12).map((q) => ({ id: q.id, cd: q.cd, x: q.x, y: q.y, ang: q.ang, anim: q.anim === 'walk' ? 'idle' : q.anim, frame: 0, k: q.k, z: q.z || 0, slot: q.slot }));
    const fan = { id: p.id, cd: p.cd, x: sx, y: sy, ang: dir, anim: 'call', k: p.k, frame: 0, view: 'front', slot: p.slot };
    const actors = others.concat([fan]);
    actors.me = [hub.px, hub.py];
    const eye = (d, h) => [mx + fx * d, h, my + fy * d];
    const look = [mx, 0.82, my];
    const th = THANKS.selfie;
    const line = th[p.i % th.length];
    // os bonecos em pé viram para Hub.camA: durante a foto ela aponta para onde a câmera
    // olha (de frente para vocês); depois volta para trás de você
    const camA0 = hub.camA;
    const ang0 = hub.ang;
    const done = () => {
      hub.camA = camA0;
      hub.ang = ang0;
      hub._back = undefined;
      p.st = 'happy';
      p.t0 = hub.t;
      const r = reward('selfie');
      say(hub, p, line, { hint: '', until: hub.t + 220 });
      setTimeout(() => pop(hub, p, '📸 <b>SELFIE!</b>'), 80); // (depois que a câmera voltou para trás de você)
      window.App?.notify?.(`📸 Selfie com um fã: ${r}`, '#f472b6');
    };
    if (!Hub.cine3d) {
      flash();
      return done();
    }
    hub.bubble = null;
    hub.camA = Math.atan2(-fy, -fx);
    Hub.cine3d([
      { dur: 1.5, eye: [eye(2.05, 1.2), eye(1.75, 1.12)], look: [look, look], fov: 50, meView: 'front', cap: '📸 SELFIE' },
      { dur: 1.6, eye: [eye(1.75, 1.12), eye(1.65, 1.1)], look: [look, look], fov: 50, meView: 'front', speaker: who(p), text: line, color: '#f472b6' }
    ], actors, done);
    setTimeout(flash, 650);
  }

  // ================================================================ LUGARES COM AÇÃO (E)
  // lanchonete (lanche que recarrega 1 de energia de treino, 1 por capítulo), metrô (vai e
  // volta entre a Estação Vitória e a Estação Parque), pipoca e sorvete (só pelo gosto) e o
  // DESAFIO DA CRIANÇADA na quadra da praça (driblar os 4 e fazer o gol)
  const LANCHE_COST = 40;
  const SPOTS = [
    { x: 7.6, y: 56.62, city: 'lanche', label: `COMPRAR LANCHE DO CRAQUE (${LANCHE_COST} 💠)`, h: 1.3 },
    { x: METRO[0].x1 + 0.22, y: (METRO[0].y0 + METRO[0].y1) / 2, city: 'metro', m: 0, label: 'PEGAR O METRÔ → ESTAÇÃO PARQUE', h: 1.6 },
    { x: (METRO[1].x0 + METRO[1].x1) / 2, y: METRO[1].y0 - 0.22, city: 'metro', m: 1, label: 'PEGAR O METRÔ → ESTAÇÃO VITÓRIA', h: 1.6 },
    { x: PIPOCA.x, y: PIPOCA.y - 0.5, city: 'pipoca', label: 'COMPRAR PIPOCA (5 💠)', h: 1.35 },
    { x: SORVETE.x, y: SORVETE.y - 0.5, city: 'sorvete', label: 'COMPRAR SORVETE (5 💠)', h: 1.35 },
    { x: COURT.x0 + 0.3, y: 40.0, city: 'desafio', label: 'DESAFIO DA CRIANÇADA (DRIBLE E GOL)', h: 1.2 }
  ];
  C.spots = function (list, hub) {
    SPOTS.forEach((s) => {
      if (Math.abs(s.x - hub.px) > 3 || Math.abs(s.y - hub.py) > 3) return;
      if (s.city === 'desafio' && CH) return;
      list.push(s);
    });
  };
  C.act = function (hub, s) {
    if (s.city === 'lanche') return lanche(hub);
    if (s.city === 'metro') return metro(hub, s.m);
    if (s.city === 'pipoca' || s.city === 'sorvete') return snack(hub, s.city);
    if (s.city === 'desafio') return startChallenge(hub);
  };
  const vendorOf = (role, x, y) => PEDS.filter((p) => p.role === role).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  // lanchonete: o Lanche do Craque recarrega 1 de energia de treino (1 por capítulo)
  function lanche(hub) {
    const A = App();
    const s = A.state;
    if (!s) return;
    const ch = s.currentChapterIndex;
    const max = window.TRAINING_ENERGY_MAX || 3;
    const e = s.trainingEnergy ?? max;
    const v = vendorOf('lanche', 8, 56);
    const talk = (t) => {
      if (v) say(hub, v, t, { until: hub.t + 260 });
      window.SFX?.blip?.(700);
    };
    if (s.cityMeal && s.cityMeal.ch === ch) return talk('Você já comeu o Lanche do Craque neste capítulo! Volta depois do próximo jogo.');
    if (e >= max) return talk(`Sua energia de treino está cheia (${e}/${max})! Vai treinar que o lanche fica pra depois.`);
    if ((s.currencies.egoCoins || 0) < LANCHE_COST) return talk(`Faltam EgoCoins... o Lanche do Craque é ${LANCHE_COST} 💠.`);
    s.currencies.egoCoins -= LANCHE_COST;
    s.trainingEnergy = Math.min(max, e + 1);
    s.cityMeal = { ch };
    A.saveState?.();
    A.updateTopHeader?.();
    talk('Saindo um Lanche do Craque! Bom treino!');
    if (v) pop(hub, v, '🍔 <b>+1 ⚡ ENERGIA</b>');
    window.SFX?.jingle?.([523, 659, 784], 0.05);
    window.App?.notify?.(`🍔 Lanche do Craque: +1 energia de treino (${s.trainingEnergy}/${max}) • −${LANCHE_COST} 💠`, '#facc15');
  }
  // pipoca e sorvete: 5 EgoCoins, só pelo gosto (e o vendedor te reconhece)
  function snack(hub, kind) {
    const A = App();
    const s = A.state;
    if (!s) return;
    const at = kind === 'pipoca' ? PIPOCA : SORVETE;
    const v = vendorOf('vendedor', at.x, at.y);
    if ((s.currencies.egoCoins || 0) < 5) {
      if (v) say(hub, v, 'Ih, sem moeda hoje? Fica pra próxima!', { until: hub.t + 200 });
      return;
    }
    s.currencies.egoCoins -= 5;
    A.saveState?.();
    A.updateTopHeader?.();
    const sn = meShirt();
    if (v) {
      say(hub, v, kind === 'pipoca' ? `Pipoca quentinha pro ${sn}! Capricha no gol do fim de semana!` : `Sorvete de casquinha pro ${sn}! Esse é por conta da casa... brincadeira!`, { until: hub.t + 240 });
      pop(hub, v, kind === 'pipoca' ? '🍿' : '🍦');
    }
    window.SFX?.blip?.(990);
    window.App?.notify?.(`${kind === 'pipoca' ? '🍿 Pipoca' : '🍦 Sorvete'} • −5 💠`, '#fbbf24');
  }
  // metrô: tela preta com o barulho do trem e você sai na outra estação
  function metro(hub, i) {
    if (hub._metro) return;
    const to = METRO[1 - i];
    hub._metro = true;
    let el = document.querySelector('.hub-metro');
    if (!el) {
      el = document.createElement('div');
      el.className = 'hub-metro';
      el.style.cssText = 'position:fixed;inset:0;background:#020617;opacity:0;transition:opacity .35s;pointer-events:none;z-index:60;display:flex;align-items:center;justify-content:center;color:#93c5fd;font:900 italic 22px system-ui;letter-spacing:2px';
      document.body.appendChild(el);
    }
    el.textContent = `🚇 ${to.id === 'parque' ? 'ESTAÇÃO PARQUE' : 'ESTAÇÃO VITÓRIA'}`;
    void el.offsetWidth;
    el.style.opacity = '1';
    try {
      window.SFX?.noise?.('lowpass', 500, 1.1, 0.18, 0, 1, 180);
      window.SFX?.tone?.('triangle', 660, 520, 0.25, 0.06, 0.15);
    } catch (e) {}
    setTimeout(() => {
      hub.px = to.out[0];
      hub.py = to.out[1];
      hub.ang = hub.camA = to.out[2];
      hub._back = undefined;
      hub.bubble = null;
      setTimeout(() => {
        el.style.opacity = '0';
        hub._metro = false;
        window.App?.notify?.(`🚇 ${to.id === 'parque' ? 'Estação Parque: o Parque do Lago e o calçadão estão aqui do lado' : 'Estação Vitória: a sua rua fica logo ali em cima'}`, '#60a5fa');
      }, 450);
    }, 420);
  }

  // ---------------------------------------------------------------- desafio da criançada
  // Você entra com a bola pelo lado oeste da quadra; os 4 garotos marcam. Leve a bola até o
  // gol do leste em 20 segundos sem perder a bola (garoto colado na bola por ~1/4 de segundo
  // rouba). Ganhar dá +20 EgoCoins (1 vez por capítulo) e a criançada vira sua fã.
  const CH_TIME = 1200; // tiques (~20 s)
  function startChallenge(hub) {
    const kids = PEDS.filter((p) => p.court);
    if (kids.length < 4 || CH) return;
    const Q = COURT;
    hub.px = Q.x0 + 1.1;
    hub.py = 40.0;
    hub.ang = hub.camA = 0;
    hub._back = undefined;
    const homes = [[Q.x0 + 4.0, 39.3], [Q.x0 + 4.4, 40.8], [Q.x0 + 7.0, 39.5], [Q.x0 + 7.6, 40.6]];
    kids.forEach((k, i) => {
      k.x = homes[i][0];
      k.y = homes[i][1];
      k.cx = k.x;
      k.cy = k.y;
      k.ang = Math.PI;
      k.st = 'idle';
      k.anim = 'idle';
    });
    CH = { t0: hub.t, end: 0, res: '', hold: 0, sec: -1 };
    say(hub, kids[0], 'Valendo! Passa por nós quatro e faz o gol lá no fundo!', { until: hub.t + 160 });
    window.SFX?.whoosh?.();
    window.App?.notify?.('⚽ DESAFIO DA CRIANÇADA: drible os 4 e faça o gol do outro lado em 20 s (SHIFT corre).', '#22c55e');
  }
  function stepChallenge(hub, kids, dt) {
    const t = hub.t;
    const Q = COURT;
    const k0 = kids[0];
    if (CH.end) {
      // resultado: os garotos comemoram (ou reclamam) e depois voltam a jogar
      kids.forEach((k) => {
        k.anim = CH.res === 'gol' ? (t - CH.end < 80 ? 'idle' : 'celebrate') : 'celebrate';
        k.ang = Math.atan2(hub.py - k.y, hub.px - k.x);
      });
      if (t - CH.end > 200) {
        kids.forEach((k) => {
          k.st = 'idle';
          k.seen = true;
        });
        CH = null;
      }
      return;
    }
    const dirX = Math.cos(hub.ang);
    const dirY = Math.sin(hub.ang);
    // a bola no seu pé (quiquinha de leve)
    BALL.x = hub.px + dirX * 0.42;
    BALL.y = hub.py + dirY * 0.42;
    BALL.z = 0.05 + Math.abs(Math.sin(t * 0.25)) * (hub.moving ? 0.06 : 0.02);
    // os garotos: quem está perto da bola vai nela; os outros guardam o lugar
    let near = false;
    kids.forEach((k, i) => {
      const dx = BALL.x - k.x;
      const dy = BALL.y - k.y;
      const d = Math.hypot(dx, dy);
      const chase = d < 3.2;
      const tx = chase ? BALL.x - dirX * 0.1 : k.cx;
      const ty = chase ? BALL.y : k.cy;
      const vx = tx - k.x;
      const vy = ty - k.y;
      const l = Math.hypot(vx, vy);
      const spd = (i < 2 ? 0.036 : 0.033) * dt;
      if (l > 0.05) {
        k.x += (vx / l) * Math.min(spd, l);
        k.y += (vy / l) * Math.min(spd, l);
        k.ang = Math.atan2(vy, vx);
        k.anim = 'run';
      } else k.anim = 'idle';
      k.x = clamp(k.x, Q.x0 + 0.3, Q.x1 - 0.3);
      k.y = clamp(k.y, Q.y0 + 0.3, Q.y1 - 0.3);
      if (d < 0.36) near = true;
    });
    CH.hold = near ? CH.hold + dt : Math.max(0, CH.hold - dt);
    const left = CH_TIME - (t - CH.t0);
    const sec = Math.ceil(left / 60);
    if (sec !== CH.sec) {
      CH.sec = sec;
      if (sec > 0) say(hub, k0, `⏱ ${sec}s — vem, craque!`, { until: t + 70 });
    }
    const out = hub.px < Q.x0 - 0.1 || hub.px > Q.x1 + 0.1 || hub.py < Q.y0 - 0.1 || hub.py > Q.y1 + 0.1;
    if (BALL.x > Q.x1 - 0.62 && Math.abs(BALL.y - 40.0) < 0.58) return endChallenge(hub, kids, 'gol');
    if (CH.hold > 14) return endChallenge(hub, kids, 'roubou');
    if (left <= 0) return endChallenge(hub, kids, 'tempo');
    if (out) return endChallenge(hub, kids, 'saiu');
  }
  function endChallenge(hub, kids, res) {
    CH.end = hub.t;
    CH.res = res;
    const k0 = kids.slice().sort((a, b) => Math.hypot(a.x - hub.px, a.y - hub.py) - Math.hypot(b.x - hub.px, b.y - hub.py))[0];
    if (res === 'gol') {
      BALL.x = COURT.x1 - 0.45;
      BALL.y = 40.0;
      BALL.z = 0.05;
      const A = App();
      const s = A.state || {};
      const ch = s.currentChapterIndex;
      let msg = 'a criançada já te pagou neste capítulo, mas a fama no bairro só cresce!';
      if (!(s.cityChallenge && s.cityChallenge.ch === ch) && s.currencies) {
        s.cityChallenge = { ch, wins: ((s.cityChallenge && s.cityChallenge.wins) || 0) + 1 };
        s.currencies.egoCoins += 20;
        msg = '+20 💠 EgoCoins';
        A.saveState?.();
        A.updateTopHeader?.();
      }
      kids.forEach((k) => (k.fan = true));
      say(hub, k0, 'NÃÃÃO! Ninguém passa por nós assim... você é bom MESMO!', { until: hub.t + 240 });
      pop(hub, { x: COURT.x1 - 0.5, y: 40, k: 0.9 }, '⚽ <b>GOL!</b>');
      window.SFX?.jingle?.([523, 659, 784, 1047], 0.06);
      window.App?.notify?.(`⚽ GOL! Você driblou a criançada inteira: ${msg}`, '#22c55e');
    } else {
      const t = { roubou: 'ROUBEI! Hahaha, de novo, de novo!', tempo: 'Acabou o tempo! A gente é muito bom, né?', saiu: 'Saiu da quadra! Vale de novo?' }[res];
      say(hub, k0, t, { until: hub.t + 220 });
      window.SFX?.blip?.(330);
      window.App?.notify?.('⚽ Não foi dessa vez. Fale de novo na entrada da quadra para outro desafio.', '#94a3b8');
    }
  }

  // entrou na portaria/rua vindo de casa: passa um pedaço do dia, os pedestres de novo e o
  // aviso de que hora é e de quanto a cidade te conhece (uma vez por saída)
  C.onArea = function (hub, a) {
    const inC = C.inCity(a);
    const s = App().state || {};
    if (inC && !hub._inCity) {
      s.cityClock = s.cityClock === undefined ? 0 : s.cityClock + 1;
      visit++;
      CH = null;
      hub._cityMsg = false;
      prewarm(hub);
      if (AIR[C.mode()] && AIR[C.mode()].dayTex) {
        // (e a versão "de dia" do atlas da cidade, para o 1º quadro de manhã não engasgar)
        (window.requestIdleCallback || ((fn) => setTimeout(fn, 30)))(() => {
          const seen = new Set();
          (Hub._3d.World.boxes || []).forEach((b) => {
            if (b.atl && !seen.has(b.atl.page)) {
              seen.add(b.atl.page);
              C.dayOf(b.atl.page);
            }
          });
        });
      }
      warmSun(C.mode()); // (a sombra do sol desta hora, adiantada enquanto você passa pela portaria)
    }
    hub._inCity = inC;
    if (!OUT_AREAS[a] || hub._cityMsg) return;
    hub._cityMsg = true;
    const f = fame();
    window.App?.notify?.(`${C.MODE_NAME[C.mode()]} na cidade • ${Math.round(f * 10)} em cada 10 pessoas te reconhecem (fama ${stars(f)}). Gols e títulos aumentam isso.`, '#f472b6');
  };

  // monta os quadros dos pedestres no tempo livre (sem travar a entrada na rua): primeiro os
  // de perto, e conforme você anda pela cidade, os que vão ficando perto
  const warmQ = [];
  const warmed = new Set();
  let pumping = false;
  function queueWarm(p) {
    if (warmed.has(p)) return;
    warmed.add(p);
    const anim = p.jog || p.kid ? 'run' : p.kind === 'walk' ? 'walk' : p.kind === 'sit' ? 'sit' : 'idle';
    ['side', 'front', 'back'].forEach((view) => [false, true].forEach((left) => {
      if (view !== 'side' && left && anim !== 'walk' && anim !== 'run') return;
      warmQ.push([p.cd, { view, left, animState: anim, frame: 0 }]);
    }));
  }
  function pump(dl) {
    const t0 = performance.now();
    const g = pump.g || (pump.g = (() => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 72;
      return cv.getContext('2d');
    })());
    while (warmQ.length && (dl && dl.timeRemaining ? dl.timeRemaining() > 3 : performance.now() - t0 < 3)) {
      const [cd, o] = warmQ.shift();
      // todos os quadros da animação nessa direção
      const A = window.SPRITE_ANIMS || {};
      let name = o.animState;
      if (name === 'walk') name = o.view === 'front' ? 'walkFB' : o.view === 'back' ? 'walkB' : 'walk';
      if (name === 'run') name = o.view === 'front' ? 'runFB' : o.view === 'back' ? 'runB' : 'run';
      const an = A[name];
      let f = 0;
      (an ? an.frames : [{ d: 6 }]).forEach((fr) => {
        try {
          PR().drawCharacterSprite(g, cd, 72, 72, Object.assign({}, o, { frame: f }));
        } catch (e) {}
        f += fr.d || 6;
      });
    }
    if (warmQ.length) (window.requestIdleCallback || ((fn) => setTimeout(fn, 40)))(pump, { timeout: 300 });
    else pumping = false;
  }
  function warmNear(hub) {
    if (!PR() || !PR().spritesV2) return;
    ACTIVE.forEach((p) => {
      if (!warmed.has(p) && Math.hypot(p.x - hub.px, p.y - hub.py) < 24) queueWarm(p);
    });
    if (warmQ.length && !pumping) {
      pumping = true;
      (window.requestIdleCallback || ((fn) => setTimeout(fn, 40)))(pump, { timeout: 300 });
    }
  }
  function prewarm(hub) {
    if (!built) build();
    recast();
    warmNear(hub);
  }

  // (para os testes e para o motor)
  C.peds = () => PEDS;
  C.pets = () => PETS;
  C.challenge = () => CH;
  C.areaAt = areaAt;
  C.routes = () => ({ ROUTES, routeLen, along });
  C.layout = { Y0, FN0, FN1, CURB_N, CURB_S, FS0, FS1, AV, R2, LAKE, TRACK, COURT, BANCA, BOARD, BUS, DOOR_X, METRO, LANCHE, PIPOCA, SORVETE, SPOTS };
  window.HubCidade = C;
})();
