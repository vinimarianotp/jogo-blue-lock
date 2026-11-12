// ============================================================================
// A CIDADE (só na carreira profissional, tema 'pro' = SEU APARTAMENTO)
// Pela porta de baixo do apartamento você desce para a portaria do prédio e sai na
// rua, de noite: fachadas com janelas acesas, lojas com placa, banca de jornal com
// você na capa, faixa de pedestre, postes, carros parados e, no fim da rua, a praça
// com uma quadrinha (a criançada jogando bola) e o telão com a sua cara.
// Pedestres andam pelas calçadas; quem te reconhece para, acena e pede autógrafo ou
// selfie (E / tocar perto dele). Quanto mais gols e títulos, mais gente te reconhece.
//
// Onde fica: ao SUL do prédio, nas linhas 30-45 da grade (o prédio usa 0-33; o vazio
// das cenas de cinema fica em x 86, fora da grade). Nos outros temas essas linhas
// nem são montadas (js/hub3d.js: mapFor / map.rows).
// O motor (js/hub3d.js e js/hub3d_gl.js) chama daqui: carve (planta), wall (paredes),
// boxes (caixas), sprites, lights, floor (chão), ambient/air (luz e céu) e a gente da
// rua: npcs, spotOf, interact, onArea, miniColor/miniMarks/miniPeds (minimapa).
// ============================================================================
(function () {
  const Hub = window.Hub;
  if (!Hub) return;
  const App = () => window.App || {};
  const PR = () => window.PixelRenderer;
  const sh = (c, k) => PR().shade(c, k);

  // ---------------------------------------------------------------- planta
  // linhas (y) da rua: fachadas do norte, calçada, meio-fio, asfalto, calçada, fachadas do sul
  const FN0 = 36.0; // fachadas do norte (caixas de 36,0 a 36,5)
  const FN1 = 36.5;
  const CURB_N = 38.5; // meio-fio do norte / do sul
  const CURB_S = 41.5;
  const FS0 = 44.1; // fachadas do sul (caixas de 44,1 a 44,98)
  const FS1 = 44.98;
  const STREET_X1 = 43.4; // o asfalto acaba aqui (frades): dali em diante é a praça
  const CW_A = [12.45, 14.55]; // faixa de pedestre na frente do seu prédio
  const CW_B = [30.45, 32.55]; // faixa do meio da rua
  const COURT = { x0: 47, y0: 37, x1: 57, y1: 43 }; // quadra da praça
  const DOOR_X = 13; // porta do apartamento (13, 30) e da rua (13, 35)
  const GAP0 = 13.0; // entrada do seu prédio na fachada (a largura da porta)
  const GAP1 = 14.0;
  const CITY_AREAS = { portaria: 1, rua: 1, praca: 1 };

  // prédios das duas calçadas: [x0, x1, altura, estilo, loja, cor da loja]
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
  const SOUTH = [
    [1.6, 7.2, 4.6, 'brick', 'PADARIA', '#f59e0b'],
    [7.2, 12.0, 5.6, 'stucco', 'FARMACIA', '#22c55e'],
    [12.0, 18.6, 6.2, 'glass', 'ESPORTES', '#ef4444'],
    [18.6, 24.6, 4.8, 'stucco', 'CAFE', '#fb923c'],
    [24.6, 31.0, 5.4, 'brick', 'LANCHES', '#facc15'],
    [31.0, 37.4, 6.6, 'glass', 'MERCADO', '#4ade80'],
    [37.4, 44.0, 4.6, 'brick', 'BARBEARIA', '#60a5fa'],
    [44.0, 52.5, 3.8, 'stucco', 'SORVETES', '#f472b6'],
    [52.5, 60.4, 5.0, 'brick', 'PIZZARIA', '#f97316']
  ];
  // carros parados: [x0, lado (0 = junto ao meio-fio de cima), cor]
  // (5 cores: os carros da mesma cor dividem as texturas)
  const CARS = [[2.6, 0, '#b91c1c'], [18.6, 0, '#e5e7eb'], [23.2, 0, '#1d4ed8'], [35.6, 0, '#facc15'], [5.4, 1, '#1f2937'], [16.0, 1, '#e5e7eb'], [26.2, 1, '#b91c1c'], [38.6, 1, '#1d4ed8']];
  const POSTS_N = [6, 18, 29.6, 41.4];
  const POSTS_S = [4.2, 10.2, 22.2, 34.0, 40.2];
  const TREES = [[7.3, 41.85], [16.4, 41.85], [26.0, 41.85], [37.2, 41.85], [45.6, 43.3], [58.6, 36.9], [45.6, 36.9]];
  const BANCA = { x0: 19.4, x1: 21.6, y0: 43.15, y1: 43.98 };
  const BUS = { x0: 32.9, x1: 35.7 };
  const BOARD = { x0: 59.18, x1: 59.44, y0: 37.4, y1: 42.6, z0: 2.05, z1: 4.75 }; // telão (virado para o oeste)

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
  // você no uniforme do clube (capa da revista, telão, ponto de ônibus)
  function meCd(th) {
    const p = prof();
    return { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: th.acc, jerseySecondary: th.acc2, number: p.number };
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
  C.fame = fame;

  // ---------------------------------------------------------------- planta (js/hub3d.js: buildMap)
  C.carve = function (K) {
    const { carve, F } = K;
    // portaria: um saguão pequeno entre o apartamento e a rua
    carve('portaria', 11, 31, 15, 34);
    carve('portaria', DOOR_X, 30, DOOR_X, 30); // porta do apartamento
    carve('portaria', DOOR_X, 35, DOOR_X, 35); // porta de vidro da rua
    // a rua (oeste) e a praça da quadra (leste)
    carve('rua', 1, 36, 44, 44);
    carve('praca', 45, 36, 60, 44);
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
    } else if (style === 'stucco') {
      for (let i = 0; i < 14; i++) R(Math.floor(rnd() * 24), Math.floor(rnd() * 24), 1, 1, sh(wall, rnd() < 0.5 ? 0.08 : -0.1));
    } else if (style === 'glass') {
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
    const wall = o.style === 'brick' ? '#7c2d12' : o.style === 'stucco' ? '#a8977d' : o.style === 'home' ? '#3f3a36' : '#1e293b';
    R(g, 0, 0, w, h, wall);
    let s = o.seed * 977 + 3;
    // (tons da parede calculados uma vez: o laço das janelas roda centenas de vezes)
    const wD = sh(wall, -0.5);
    const wL = sh(wall, 0.3);
    const SHADE = new Map();
    const shd = (c, k) => SHADE.get(c + k) || (SHADE.set(c + k, sh(c, k)), SHADE.get(c + k));
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    // textura da parede num ladrilho pequeno repetido (um fillRect só: antes eram milhares de
    // retangulinhos por prédio e a cidade demorava para montar)
    g.fillStyle = g.createPattern(wallTile(o.style, wall), 'repeat');
    g.fillRect(0, 0, w, h);
    // cornija no alto
    R(g, 0, 0, w, 3, sh(wall, 0.25));
    R(g, 0, 3, w, 1, sh(wall, -0.45));
    const GF = Math.round(1.75 * FD); // altura do térreo
    const FH = Math.round(1.3 * FD); // altura de cada andar
    // andares: janelas acesas (morno, TV azulada) ou apagadas; varandas no seu prédio
    for (let fy = h - GF - FH; fy >= 6; fy -= FH) {
      R(g, 0, fy + FH - 2, w, 2, sh(wall, o.style === 'glass' ? 0.2 : -0.3));
      if (o.style === 'home') R(g, 0, fy + FH - 3, w, 1, '#a8a29e');
      const step = o.style === 'glass' ? 12 : FD;
      const ww = o.style === 'glass' ? 10 : 12;
      for (let x = Math.round(((w - 6) % step) / 2) + 3; x + ww <= w - 3; x += step) {
        if (o.gap && x + ww > o.gap[0] && x < o.gap[1] && fy > h - GF - FH * 1.2) continue;
        const r = rnd();
        const lit = r < (o.style === 'glass' ? 0.45 : 0.55);
        const col = !lit ? (o.style === 'glass' ? '#0f172a' : '#1e293b') : r < 0.1 ? '#93c5fd' : r < 0.32 ? '#fde68a' : '#fcd34d';
        const wy = fy + 5;
        const wh = o.style === 'glass' ? FH - 8 : 15;
        R(g, x - 1, wy - 1, ww + 2, wh + 2, wD);
        R(g, x, wy, ww, wh, col);
        if (lit) {
          R(e, x, wy, ww, wh, '#fff');
          // cortina, gente (silhueta) ou planta na janela
          const q = rnd();
          if (q < 0.3) R(g, x, wy, Math.round(ww / 3), wh, shd(col, -0.35));
          else if (q < 0.45) {
            R(g, x + 4, wy + 6, 4, wh - 6, shd(col, -0.6));
            R(g, x + 5, wy + 3, 2, 3, shd(col, -0.6));
          }
        } else R(g, x + 1, wy + 1, 2, wh - 4, 'rgba(148,163,184,0.25)');
        if (o.style !== 'glass') {
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
    }
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
      R(g, 0, gy + 2, w, GF - 5, sh(wall, -0.3));
      for (let x = 6; x + 14 < w; x += 22) {
        R(g, x, gy + 10, 14, GF - 18, '#0f172a');
        R(g, x + 1, gy + 11, 12, GF - 20, rnd() < 0.5 ? '#334155' : '#1e293b');
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
    // placa
    const name = o.shop;
    const tw = name.length * 4 + 7;
    const px = Math.round(w / 2 - tw / 2);
    R(g, px, gy - 3, tw, 10, '#020617');
    R(g, px + 1, gy - 2, tw - 2, 8, sh(c, -0.55));
    txt(g, name, Math.round(w / 2), gy, c, 1);
    txt(e, name, Math.round(w / 2), gy, '#fff', 1);
    R(g, px + 1, gy - 2, tw - 2, 1, c);
    R(e, px + 1, gy - 2, tw - 2, 1, '#fff');
  }
  // o que aparece na vitrine de cada loja (pixel art pequena)
  function drawShopInside(g, e, x, y, w, h, o, K, th) {
    const { R, txt } = K;
    const k = o.shop;
    if (k === 'ESPORTES') {
      // a sua camisa do clube na vitrine, com o seu número
      for (let i = 0; i < Math.floor(w / 18); i++) {
        const sx = x + 3 + i * 18;
        const mine = i % 2 === 0;
        const c1 = mine ? th.acc : '#e5e7eb';
        R(g, sx + 2, y + 3, 10, 12, c1);
        R(g, sx, y + 3, 3, 5, c1);
        R(g, sx + 11, y + 3, 3, 5, c1);
        R(g, sx + 5, y + 3, 4, 2, sh(c1, -0.4));
        if (mine) txt(g, String(prof().number || 10).slice(0, 2), sx + 7, y + 7, th.acc2 === '#f8fafc' ? '#0f172a' : th.acc2, 1);
        R(g, sx + 6, y + 1, 2, 2, '#57534e');
      }
      R(g, x, y + h - 4, w, 4, '#78350f');
      return;
    }
    if (k === 'CINEMA') {
      // cartaz do filme e lâmpadas em volta
      for (let i = 0; i < Math.floor(w / 18); i++) {
        const sx = x + 2 + i * 18;
        R(g, sx, y + 2, 14, h - 4, i % 2 ? '#7c3aed' : '#0f172a');
        R(g, sx + 3, y + 6, 8, 8, i % 2 ? '#fde68a' : th.acc);
      }
      for (let bx = x; bx < x + w; bx += 4) {
        R(g, bx, y, 2, 2, '#fde68a');
        R(e, bx, y, 2, 2, '#fff');
      }
      return;
    }
    // prateleiras com coisas coloridas (padaria, mercado, farmácia...)
    const pal = { PADARIA: ['#d97706', '#fbbf24', '#92400e'], FARMACIA: ['#f8fafc', '#22c55e', '#38bdf8'], CAFE: ['#78350f', '#f8fafc', '#a16207'], LANCHES: ['#ef4444', '#facc15', '#f97316'], MERCADO: ['#22c55e', '#ef4444', '#facc15'], BARBEARIA: ['#e5e7eb', '#60a5fa', '#ef4444'], SORVETES: ['#f9a8d4', '#fde68a', '#a5f3fc'], PIZZARIA: ['#ef4444', '#facc15', '#78350f'], LIVRARIA: ['#1d4ed8', '#b91c1c', '#16a34a'], FLORES: ['#ec4899', '#facc15', '#22c55e'], RESTAURANTE: ['#f8fafc', '#dc2626', '#a16207'], HOTEL: ['#fbbf24', '#f8fafc', '#78350f'], ESCOLINHA: ['#22c55e', '#f8fafc', '#facc15'] }[k] || ['#e5e7eb', '#94a3b8', '#facc15'];
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

  // ---------------------------------------------------------------- caixas (js/hub3d.js: buildBoxesGen)
  C.boxes = function* (th, K) {
    const { box, R, txt, makeTex, faceTex, WALL_H } = K;
    const flats = new Map();
    const flat = (c) => flats.get(c) || (flats.set(c, K.flat(c)), flats.get(c));
    const ftex = (lenT, hT, draw) => makeTex(Math.max(2, Math.round(lenT * FD)), Math.max(2, Math.round(hT * FD)), draw);
    // (cada textura diferente vira um desenho a mais por quadro no 3D: as laterais lisas são
    // uma textura só por cor, esticada na face, e as peças repetidas dividem a mesma)
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
      if (style === 'home') {
        // o seu prédio: a entrada (x 12,55-14,45) fica aberta embaixo; marquise acesa por cima
        const gap = [Math.round((GAP0 - x0) * FD), Math.round((GAP1 - x0) * FD)];
        const tex = front({ style, gap }, x1 - x0, hh, 50 + i);
        // a mesma arte dividida em 3 caixas: esquerda, direita e o pedaço acima da entrada
        const part = (a, b, z0) => {
          const w0 = Math.round((a - x0) * FD);
          const w1 = Math.round((b - x0) * FD);
          const hz = Math.round((hh - z0) * FD);
          const t = { w: w1 - w0, h: hz, px: new Uint32Array((w1 - w0) * hz), em: tex.em ? new Uint8Array((w1 - w0) * hz) : null };
          for (let y = 0; y < hz; y++) for (let x = 0; x < t.w; x++) {
            t.px[y * t.w + x] = tex.px[y * tex.w + x + w0];
            if (t.em) t.em[y * t.w + x] = tex.em[y * tex.w + x + w0];
          }
          return t;
        };
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
    SOUTH.forEach(([x0, x1, hh, style, shop, color], i) => {
      box(x0, FS0, x1, FS1, 0, hh, { N: front({ style, shop, color, doorLeft: i % 2 === 1 }, x1 - x0, hh, 20 + i), side: dark, T: roof });
    });
    // as pontas: um prédio fechando a rua no oeste e outro atrás do telão no leste
    box(1.0, FN0, 1.6, FS1, 0, 6.0, { E: front({ style: 'stucco' }, FS1 - FN0, 6.0, 40), side: dark, T: roof });
    box(60.4, FN0, 60.98, FS1, 0, 6.6, { W: front({ style: 'brick' }, FS1 - FN0, 6.6, 41), side: dark, T: roof });
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
    CARS.forEach(([x0, lane, col]) => {
      const f = carFaces(col);
      const y0 = lane ? CURB_S - 0.95 : CURB_N + 0.1;
      const y1 = y0 + 0.85;
      const x1 = x0 + 1.9;
      // os de cima apontam para o leste, os de baixo para o oeste (mão da rua)
      const east = !lane;
      box(x0, y0, x1, y1, 0.04, 0.54, { N: f.side, S: f.side, E: east ? f.frontF : f.backF, W: east ? f.backF : f.frontF, T: f.top });
      box(x0 + 0.38, y0 + 0.06, x1 - 0.32, y1 - 0.06, 0.54, 0.9, { N: f.cabSide, S: f.cabSide, E: f.cabEnd, W: f.cabEnd, T: f.cabTop });
    });
    yield;
    // ---- postes (luz morna embaixo da cabeça) e semáforos
    const poleC = flat('#1f2937');
    const lampB = faceTex(0.5, 0.22, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#fef3c7');
      R(e, 0, 0, w, h, '#fff');
    });
    const post = (x, y, dir) => {
      box(x - 0.05, y - 0.05, x + 0.05, y + 0.05, 0, 2.62, { side: poleC, T: poleC });
      const ay = y + dir * 0.5;
      box(x - 0.04, Math.min(y, ay), x + 0.04, Math.max(y, ay), 2.55, 2.62, { side: poleC, T: poleC }, { solid: false });
      box(x - 0.25, ay - 0.11, x + 0.25, ay + 0.11, 2.47, 2.6, { side: flat('#111827'), T: flat('#111827'), B: lampB }, { solid: false });
    };
    POSTS_N.forEach((x) => post(x, 38.3, 1));
    POSTS_S.forEach((x) => post(x, 41.72, -1));
    // praça: dois postes e os refletores da quadra
    post(46.2, 43.7, -1);
    post(57.8, 36.4, 1);
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
      box(x - 0.11, y - 0.09, x + 0.11, y + 0.09, 1.95, 2.53, { side: flat('#0b0f1a'), [face]: hd, T: flat('#0b0f1a') }, { solid: false });
      box(x - 0.11, y - 0.09, x + 0.11, y + 0.09, 1.45, 1.75, { side: flat('#0b0f1a'), N: ped, S: ped }, { solid: false });
    };
    sem(30.2, 41.72, 'W');
    sem(32.8, 38.28, 'E');
    yield;
    // ---- banca de jornal (verde, com você na capa) e o ponto de ônibus
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
    // cobertura da banca e o letreiro
    box(B.x0 - 0.12, B.y0 - 0.32, B.x1 + 0.12, B.y1 + 0.05, 1.45, 1.56, { side: flat('#166534'), T: flat('#14532d'), B: flat('#0f2a1a') }, { solid: false });
    yield;
    const bs = BUS;
    // abrigo: painel do fundo com o cartaz do clube (você), banco e teto
    box(bs.x0, 43.9, bs.x1, 44.04, 0, 1.95, {
      side: flat('#334155'),
      N: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#1e293b');
        // cartaz aceso: o clube e você
        const px = Math.round(w * 0.55);
        const pw = Math.round(w * 0.4);
        R(g, px, 8, pw, h - 22, '#020617');
        R(g, px + 1, 9, pw - 2, h - 24, th.acc2);
        drawMePortrait(g, px + 1, 14, pw - 2, h - 30, th, K, 1.6);
        R(g, px + 1, h - 22, pw - 2, 8, '#020617');
        txt(g, noAcc((clubOf() && clubOf().name) || 'LIGA').split(' ')[0].slice(0, 9), px + pw / 2, h - 20, th.acc, 1);
        // (a moldura e a faixa do nome acesas; o rosto fica nítido, sem o brilho por cima)
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
    box(bs.x0 + 0.2, 43.42, bs.x1 - 0.2, 43.82, 0, 0.42, { side: side('#64748b', true), T: flat('#94a3b8') });
    box(bs.x0 - 0.1, 43.15, bs.x1 + 0.1, 44.06, 1.95, 2.04, { side: flat('#334155'), T: flat('#475569'), B: flat('#1e293b') }, { solid: false });
    // placa do ponto
    box(bs.x0 - 0.35, 42.3, bs.x0 - 0.27, 42.38, 0, 2.1, { side: poleC });
    box(bs.x0 - 0.43, 42.3, bs.x0 - 0.19, 42.38, 1.8, 2.14, {
      side: flat('#1d4ed8'),
      N: faceTex(0.24, 0.34, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#1d4ed8');
        R(g, 2, 2, w - 4, h - 4, '#f8fafc');
        R(g, 3, 4, w - 6, 3, '#1d4ed8');
      })
    }, { solid: false });
    yield;
    // ---- fim do asfalto: frades (os pedestres passam, os carros não)
    for (let y = CURB_N + 0.3; y < CURB_S - 0.2; y += 0.62) {
      box(STREET_X1 - 0.07, y - 0.07, STREET_X1 + 0.07, y + 0.07, 0, 0.55, {
        side: shared('frade', () => faceTex(0.14, 0.55, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#9ca3af');
          R(g, 0, 3, w, 2, '#facc15');
        })),
        T: flat('#d1d5db')
      });
    }
    // ---- a praça: quadra cercada (alambrado com entrada a oeste), golzinhos e bancos
    // rede dos golzinhos (uma textura só, esticada nas faces)
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
      box(Math.min(gx, gx) - 0.04, 39.4, gx + 0.04, 39.48, 0, 0.8, { side: white });
      box(gx - 0.04, 40.52, gx + 0.04, 40.6, 0, 0.8, { side: white });
      box(gx - 0.04, 39.4, gx + 0.04, 40.6, 0.76, 0.84, { side: white, T: white }, { solid: false });
      box(Math.min(gx, back), 39.4, Math.max(gx, back), 39.43, 0, 0.8, { side: net });
      box(Math.min(gx, back), 40.57, Math.max(gx, back), 40.6, 0, 0.8, { side: net });
      box(back - 0.02, 39.4, back + 0.02, 40.6, 0, 0.8, { side: net });
    });
    const bench = (x0, y0, x1, y1) => {
      box(x0, y0, x1, y1, 0, 0.4, { side: side('#78350f', true), T: flat('#92400e') });
    };
    bench(45.3, 38.0, 45.75, 39.2);
    bench(45.3, 40.8, 45.75, 42.0);
    // refletores da quadra (em postes altos nos cantos)
    [[Q.x0 - 0.4, Q.y0 - 0.4], [Q.x1 + 0.4, Q.y1 + 0.4]].forEach(([x, y]) => {
      box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0, 4.0, { side: poleC });
      box(x - 0.35, y - 0.12, x + 0.35, y + 0.12, 3.85, 4.15, { side: flat('#111827'), T: flat('#111827'), B: lampB }, { solid: false });
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

  // ---------------------------------------------------------------- enfeites em pé (js/hub3d.js: buildSprites)
  let TREE = null;
  function treeTex(K) {
    if (TREE) return TREE;
    TREE = K.makeTex(44, 76, (g) => {
      const R = K.R;
      R(g, 19, 46, 6, 30, '#4a2f1d');
      R(g, 19, 46, 2, 30, '#6b4429');
      const blob = (cx, cy, r, c) => {
        for (let y = -r; y <= r; y++) {
          const hw = Math.round(Math.sqrt(r * r - y * y));
          R(g, cx - hw, cy + y, hw * 2, 1, c);
        }
      };
      blob(22, 30, 17, '#14532d');
      blob(13, 34, 10, '#166534');
      blob(31, 33, 11, '#166534');
      blob(22, 20, 13, '#15803d');
      blob(17, 16, 7, '#16a34a');
      blob(28, 24, 6, '#16a34a');
      for (let i = 0; i < 40; i++) R(g, 6 + ((i * 17) % 32), 8 + ((i * 11) % 36), 1, 1, i % 3 ? '#22c55e' : '#052e16');
    });
    return TREE;
  }
  C.sprites = function (th, add, L, K) {
    const P = Hub.P;
    TREES.forEach(([x, y], i) => L.push({ key: 'tree' + i, tex: treeTex(K), x, y, r: 0.24, k: 2.3, shadow: 0.5 }));
    [[11.2, 41.8], [24.0, 41.8], [36.0, 43.55], [44.6, 42.5]].forEach(([x, y]) => add('bin', () => P.bin(0, 0), x, y, { r: 0.18 }));
    [[2.4, 43.8], [9.0, 36.75], [17.0, 36.75], [23.4, 43.8], [29.6, 36.75], [50.5, 43.8]].forEach(([x, y]) => add('plant', () => P.plant(0, 0), x, y, { r: 0.2 }));
    // cavalete da banca com a manchete do dia (você)
    const s = App().state || {};
    const head = (s.unlockedAchievements || []).includes('ach_ballon_dor') ? 'BOLA DE OURO!' : (s.careerGoals || 0) > 0 ? `${s.careerGoals} GOLS!` : 'A NOVA ESTRELA';
    const board = K.makeTex(34, 42, (g, e) => {
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
    L.push({ key: 'cavalete', tex: board, x: BANCA.x1 + 0.5, y: 43.1, r: 0.15, k: 1.4, shadow: 0.2 });
    // placa da rua
    const sign = K.makeTex(52, 84, (g) => {
      const R = K.R;
      R(g, 24, 10, 3, 74, '#475569');
      R(g, 0, 0, 52, 12, '#14532d');
      R(g, 1, 1, 50, 10, '#166534');
      K.txt(g, 'R. DA VITORIA', 26, 4, '#f8fafc', 1);
    });
    L.push({ key: 'placa', tex: sign, x: 15.6, y: 38.25, r: 0.08, k: 1.6, shadow: 0.1 });
  };

  // ---------------------------------------------------------------- luzes (js/hub3d.js: buildLightGen)
  C.ambient = (amb) => [amb[0] * 0.5 + 0.06, amb[1] * 0.5 + 0.07, amb[2] * 0.5 + 0.15];
  C.lights = function (th, add) {
    const lamp = '#fdba74';
    POSTS_N.forEach((x) => add(x, 38.75, 4.6, lamp, 0.95, 'rua', { z: 2.5, also: x > 40 ? 'praca' : undefined }));
    POSTS_S.forEach((x) => add(x, 41.25, 4.6, lamp, 0.95, 'rua', { z: 2.5 }));
    add(46.2, 43.25, 4.4, lamp, 0.9, 'praca', { z: 2.5, also: 'rua' });
    add(57.8, 36.85, 4.4, lamp, 0.9, 'praca', { z: 2.5 });
    // vitrines (cor da loja) e a entrada do seu prédio
    NORTH.forEach(([x0, x1, , style, shop, color]) => {
      if (shop) add((x0 + x1) / 2, 37.1, 2.6, color, 0.5, x0 < 44.5 ? 'rua' : 'praca', { z: 1.0 });
    });
    SOUTH.forEach(([x0, x1, , , shop, color]) => {
      if (shop) add((x0 + x1) / 2, 43.5, 2.6, color, 0.5, x0 < 44 ? 'rua' : 'praca', { z: 1.0 });
    });
    add(13.5, 36.9, 2.6, '#fef3c7', 0.8, 'rua', { z: 1.9 });
    add((BANCA.x0 + BANCA.x1) / 2, 42.8, 2.2, '#fef3c7', 0.55, 'rua', { z: 1.3 });
    add((BUS.x0 + BUS.x1) / 2, 43.5, 2.2, '#bae6fd', 0.5, 'rua', { z: 1.9 });
    // telão e refletores da quadra
    add(57.6, 40, 5.6, th.acc, 0.55, 'praca', { z: 3.3 });
    add(52, 40, 6.6, '#f8fafc', 0.55, 'praca', { z: 4.0 });
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
    manha: { skyTop: [0.18, 0.45, 0.92], skyHor: [0.78, 0.88, 0.97], stars: 0, fog: [0.72, 0.8, 0.9], fogK: 0.011, expo: 1.0, day: 1, sun: unit(0.45, 0.78, 0.43), sunC: [1.0, 0.9, 0.7], ambD: [0.4, 0.46, 0.6], dayTex: true },
    tarde: { skyTop: [0.24, 0.24, 0.52], skyHor: [1.0, 0.58, 0.3], stars: 0.001, fog: [0.55, 0.4, 0.36], fogK: 0.015, expo: 1.03, day: 0.72, sun: unit(-0.55, 0.32, 0.77), sunC: [1.0, 0.6, 0.32], ambD: [0.42, 0.36, 0.44], dayTex: false },
    noite: { skyTop: [0.04, 0.05, 0.16], skyHor: [0.55, 0.27, 0.2], stars: 0.004, fog: [0.07, 0.06, 0.11], fogK: 0.02, expo: 1.08, day: 0 }
  };
  // céu, névoa, exposição e sol na rua (o motor 3D usa quando você está na cidade)
  C.air = function (ai) {
    const id = (Hub._3d && Hub._3d.AREA_IDS[ai]) || '';
    if (!CITY_AREAS[id]) return null;
    const a = AIR[C.mode()];
    return id === 'portaria' ? Object.assign({}, a, { fogK: 0.04 }) : a;
  };
  // altura dos prédios das duas calçadas a cada x (para a sombra do sol): [norte, sul]
  const HN = new Float32Array(64);
  const HS = new Float32Array(64);
  NORTH.forEach(([x0, x1, h]) => {
    for (let x = Math.floor(x0); x < Math.ceil(x1) && x < 64; x++) HN[x] = Math.max(HN[x], h);
  });
  SOUTH.forEach(([x0, x1, h]) => {
    for (let x = Math.floor(x0); x < Math.ceil(x1) && x < 64; x++) HS[x] = Math.max(HS[x], h);
  });
  // a mesma tabela numa textura 64 x 2 (linha 0 = norte, 1 = sul; altura / 8) para o shader
  C.heightsRGBA = () => {
    const d = new Uint8Array(64 * 2 * 4);
    for (let x = 0; x < 64; x++) {
      d[x * 4] = Math.round((HN[x] / 8) * 255);
      d[(64 + x) * 4] = Math.round((HS[x] / 8) * 255);
      d[x * 4 + 3] = d[(64 + x) * 4 + 3] = 255;
    }
    return d;
  };
  C.FN1 = FN1;
  C.FS0 = FS0;
  // o ponto (x, y, altura z) está na sombra dos prédios? (igual à conta do shader)
  function shade(x, y, z, sun) {
    if (sun[2] > 0.001) {
      const t = (FS0 - y) / sun[2];
      if (t > 0) {
        const hx = Math.floor(x + sun[0] * t);
        if (hx >= 0 && hx < 64 && z + sun[1] * t < HS[hx]) return 0;
      }
    } else if (sun[2] < -0.001) {
      const t = (FN1 - y) / sun[2];
      if (t > 0) {
        const hx = Math.floor(x + sun[0] * t);
        if (hx >= 0 && hx < 64 && z + sun[1] * t < HN[hx]) return 0;
      }
    }
    return 1;
  }
  // luz de dia num boneco em pé na cidade (céu + sol, se não estiver na sombra)
  C.dayLight = (x, y, F, out) => {
    const s = shade(x, y, 0.8, F.sun) * 0.6;
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
    d = { w: t.w, h: t.h, px, em: null };
    DAY.set(t, d);
    return d;
  };

  // ---------------------------------------------------------------- chão (js/hub3d.js: bakeGen)
  C.floor = function (th) {
    const acc = Hub.rgbOf(th.acc);
    // (roda ~570 mil vezes ao montar a cidade: sem criar listas/funções, sem hypot/forEach)
    const A0 = CW_A[0];
    const A1 = CW_A[1];
    const B0 = CW_B[0];
    const B1 = CW_B[1];
    const MAN = [9.0, 40.8, 36.0, 39.2, 22.0, 41.25]; // bueiros
    const Q = COURT;
    const ix = Q.x0 + 0.4;
    const ax = Q.x1 - 0.4;
    const iy = Q.y0 + 0.4;
    const ay = Q.y1 - 0.4;
    const qcx = (Q.x0 + Q.x1) / 2;
    const qcy = (Q.y0 + Q.y1) / 2;
    const ln = 0.045;
    // pedrinhas de calçada (0,5 x 0,5), asfalto com grão, faixa, meio-fio, bueiros, quadra
    return function (id, wx, wy, gx, gy, out) {
      const h = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0;
      const n = ((h >>> 8) & 15) - 7; // grão
      let r;
      let g;
      let b;
      if (id === 'rua' && wy > CURB_N && wy < CURB_S && wx < STREET_X1) {
        // asfalto
        r = 40 + n;
        g = 42 + n;
        b = 50 + n;
        if (((h >>> 3) & 63) === 0) {
          r += 18;
          g += 18;
          b += 18;
        }
        // sarjeta escura perto do meio-fio
        if (wy < CURB_N + 0.12 || wy > CURB_S - 0.12) {
          r -= 12;
          g -= 12;
          b -= 12;
        }
        // faixa amarela tracejada no meio
        if (wy > 39.955 && wy < 40.045 && wx % 1.6 < 0.9 && wx > 1.8 && wx < STREET_X1 - 0.4) {
          r = 202;
          g = 160;
          b = 22;
        }
        // faixas de pedestre (barras brancas uma depois da outra, gastas) e as linhas de parada
        if (((wx > A0 && wx < A1) || (wx > B0 && wx < B1)) && wy > CURB_N + 0.16 && wy < CURB_S - 0.16 && (wy - CURB_N - 0.16) % 0.5 < 0.25) {
          const k = ((h >>> 12) & 7) === 0 ? 0.75 : 1;
          r = 214 * k;
          g = 218 * k;
          b = 224 * k;
        } else if ((wx > A0 - 0.4 && wx < A0 - 0.3) || (wx > B1 + 0.3 && wx < B1 + 0.4)) {
          r = 200;
          g = 204;
          b = 210;
        }
        // bueiros
        for (let i = 0; i < 6; i += 2) {
          const dx = wx - MAN[i];
          const dy = wy - MAN[i + 1];
          const d2 = dx * dx + dy * dy;
          if (d2 >= 0.1024) continue;
          if (d2 > 0.0784) {
            r = 20;
            g = 22;
            b = 28;
          } else if ((Math.floor(wx * 16) + Math.floor(wy * 16)) % 3) {
            r = 52;
            g = 54;
            b = 62;
          } else {
            r = 30;
            g = 32;
            b = 38;
          }
        }
      } else {
        // meio-fio (pedra clara) na borda do asfalto
        const cs = id === 'rua' && wx > STREET_X1 - 0.1 && wx < STREET_X1 + 0.1 && wy > CURB_N && wy < CURB_S;
        const cn = id === 'rua' && wx < STREET_X1 && ((wy > CURB_N - 0.1 && wy < CURB_N + 0.1) || (wy > CURB_S - 0.1 && wy < CURB_S + 0.1));
        if (cs || cn) {
          const top = cs ? wx > STREET_X1 + 0.04 : wy < CURB_N ? wy > CURB_N - 0.04 : wy < CURB_S + 0.04;
          r = top ? 176 : 150;
          g = top ? 178 : 152;
          b = top ? 184 : 158;
        } else if (id === 'praca' || wx >= STREET_X1) {
          // calçada portuguesa: ondas pretas e brancas de pedrinha
          const wave = (wy + Math.sin(wx * 1.9) * 0.32) % 0.9;
          const st = ((gx >> 1) + (gy >> 1)) & 1;
          if (wave < 0.42) {
            r = 46 + st * 8;
            g = 44 + st * 8;
            b = 44 + st * 8;
          } else {
            r = 196 + st * 10;
            g = 190 + st * 10;
            b = 180 + st * 10;
          }
          if (((gx & 1) === 0 && (gy & 1) === 0) || ((h >>> 5) & 15) === 0) {
            r *= 0.82;
            g *= 0.82;
            b *= 0.82;
          }
        } else {
          // ladrilhos de cimento 0,5 x 0,5
          const tile = (((gx >> 4) + (gy >> 4)) & 1) === 0;
          r = (tile ? 118 : 108) + n;
          g = (tile ? 116 : 106) + n;
          b = (tile ? 112 : 104) + n;
          if ((gx & 15) === 0 || (gy & 15) === 0) {
            r -= 30;
            g -= 30;
            b -= 30;
          }
        }
        // tapetinho de mármore na entrada do seu prédio
        if (wx > GAP0 && wx < GAP1 && wy < 36.5) {
          if (wy > 36.41 && wy < 36.49) {
            r = acc[0];
            g = acc[1];
            b = acc[2];
          } else {
            r = 70 + n;
            g = 62 + n;
            b = 58 + n;
          }
        }
        // a quadra da praça: azul com borda de terra, linhas brancas
        if (id === 'praca' && wx > Q.x0 && wx < Q.x1 && wy > Q.y0 && wy < Q.y1) {
          if (wx > ix && wx < ax && wy > iy && wy < ay) {
            r = 30 + n;
            g = 64 + n;
            b = 150 + n;
          } else {
            r = 150 + n;
            g = 70 + n;
            b = 40 + n;
          }
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
          if (line) {
            r = 226;
            g = 232;
            b = 240;
          }
        }
      }
      out[0] = r < 0 ? 0 : r > 255 ? 255 : r;
      out[1] = g < 0 ? 0 : g > 255 ? 255 : g;
      out[2] = b < 0 ? 0 : b > 255 ? 255 : b;
      out[3] = 0;
    };
  };

  // ---------------------------------------------------------------- minimapa
  C.miniColor = (id, x, y) => {
    if (id === 'portaria') return '#57534e';
    if (id !== 'rua' && id !== 'praca') return null;
    const cx = x + 0.5;
    const cy = y + 0.5;
    if (id === 'praca' && cx > COURT.x0 && cx < COURT.x1 && cy > COURT.y0 && cy < COURT.y1) return '#1e40af';
    if (id === 'rua' && cy > CURB_N && cy < CURB_S && cx < STREET_X1) return (cx > CW_A[0] && cx < CW_A[1]) || (cx > CW_B[0] && cx < CW_B[1]) ? '#64748b' : '#1f2937';
    return '#475569';
  };
  C.miniMarks = (g, K) => {
    // banca (verde), telão (cor do clube), ponto de ônibus (azul)
    const th = Hub._3d && Hub._3d.World.th;
    g.fillStyle = '#22c55e';
    g.fillRect(Math.floor(BANCA.x0) * K, Math.floor(BANCA.y0) * K, 6, 3);
    g.fillStyle = (th && th.acc) || '#facc15';
    g.fillRect(Math.floor(BOARD.x0) * K, Math.floor(BOARD.y0) * K, 3, 15);
    g.fillStyle = '#60a5fa';
    g.fillRect(Math.floor(BUS.x0) * K, 43 * K, 8, 3);
  };
  C.miniPeds = (g, K, hub) => {
    if (!C.inCity(hub.area) || !ACTIVE.length) return;
    ACTIVE.forEach((p) => {
      if (p.ball) return;
      g.fillStyle = p.fan && p.seen ? '#f472b6' : '#cbd5e1';
      g.fillRect(Math.floor(p.x * K) - 1, Math.floor(p.y * K) - 1, 2, 2);
    });
  };

  // ================================================================ GENTE DA RUA
  // rotas das calçadas (pontos em ordem; o pedestre anda em volta, sem parar)
  const ROUTES = {
    // quarteirão: calçada de cima para o leste, atravessa na faixa do meio, volta pela de baixo
    block: [[13.5, 37.05], [31.5, 37.05], [31.5, 42.35], [13.5, 42.35]],
    // volta grande: calçada de cima para o oeste, atravessa no fim da rua, a de baixo para o
    // leste, contorna a praça (atrás da quadra) e volta
    big: [[44.2, 37.75], [2.4, 37.75], [2.4, 42.95], [44.2, 42.95], [46.3, 43.62], [58.4, 43.62], [58.4, 36.95], [46.3, 36.95]],
    // volta em torno da quadra (do outro lado)
    plaza: [[46.6, 37.4], [58.0, 37.4], [58.0, 43.25], [46.6, 43.25]]
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
  // [tipo, rota/lugar, posição na rota ou [x, y, ângulo], velocidade]
  const CAST = [
    ['walk', 'block', 0, 0.021],
    ['walk', 'block', 23, 0.024],
    ['walk', 'big', 4, 0.022],
    ['walk', 'big', 46, 0.025],
    ['walk', 'big', 88, 0.02],
    ['walk', 'plaza', 3, 0.019],
    ['walk', 'plaza', 22, 0.023],
    ['stand', [15.4, 33.6, Math.PI], 'porteiro'], // o porteiro, atrás do balcão
    ['sit', [34.3, 43.55, -Math.PI / 2]], // no banco do ponto de ônibus
    ['stand', [35.95, 43.15, Math.PI]], // esperando o ônibus
    ['stand', [19.85, 42.62, Math.PI / 2 + 0.3]], // lendo as revistas da banca (do lado: a capa fica à vista)
    ['sit', [45.52, 38.32, 0]], // no banco da praça, vendo a pelada
    ['sit', [45.52, 38.92, 0]],
    ['kid', [49.3, 38.8]],
    ['kid', [50.0, 41.4]],
    ['kid', [54.4, 38.9]],
    ['kid', [54.9, 41.2]],
    // só de dia (manhã e fim de tarde): mais gente na rua
    ['walk', 'block', 10, 0.022, 'dia'],
    ['kidwalk', 'block', 9.35, 0.022, 'dia'], // a criança andando junto com o adulto da frente
    ['walk', 'big', 25, 0.023, 'dia'],
    ['walk', 'big', 66, 0.021, 'dia'],
    ['jog', 'big', 105, 0.046, 'dia'], // correndo de manhã
    ['walk', 'plaza', 13, 0.02, 'dia'],
    ['stand', [23.95, 43.3, 0], null, null, 'dia'], // conversando na porta do café
    ['stand', [24.6, 43.3, Math.PI], null, null, 'dia']
  ];
  const PEDS = [];
  let BALL = null;
  let built = false;
  function build() {
    built = true;
    PEDS.length = 0;
    CAST.forEach((c, i) => {
      const [kind0, where, a2, spd, dia] = c;
      const q = Math.floor(rnd01(i, 3) * 1e6);
      // (kid = joga na quadra; small = criança (menor); jog = correndo pela rua)
      const kid = kind0 === 'kid';
      const small = kid || kind0 === 'kidwalk';
      const kind = kind0 === 'kidwalk' || kind0 === 'jog' ? 'walk' : kind0;
      // alguns torcedores usam a camisa do seu clube (com o seu número)
      const jersey = !small && kind !== 'stand' && i % 4 === 1;
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
      if (a2 === 'porteiro') {
        cd.outfit = 'suit';
        cd.hairColor = '#9ca3af';
        cd.hairStyle = 'parted_glasses';
      }
      if (!small && (q >> 9) % 7 === 0) cd.hat = 'beanie';
      const p = { id: 'ped' + i, i, kind, cd, jersey, porter: a2 === 'porteiro', kid, small, jog: kind0 === 'jog', dayOnly: dia === 'dia', x: 0, y: 0, ang: 0, anim: 'idle', st: 'walk', t0: 0, ph: (q >> 5) % 97, k: small ? 0.66 : 0.9 };
      if (kind === 'walk') {
        p.route = where;
        p.s = a2;
        p.spd = spd;
        const [x, y, ang] = along(where, a2);
        Object.assign(p, { x, y, ang, anim: p.jog ? 'run' : 'walk' });
      } else {
        p.hx = where[0];
        p.hy = where[1];
        p.x = where[0];
        p.y = where[1];
        p.ang = where[2] || 0;
        p.ang0 = p.ang;
        p.anim = kind === 'sit' ? 'sit' : kid ? 'run' : 'idle';
        p.st = 'idle';
      }
      PEDS.push(p);
    });
    BALL = { id: 'bola', ball: true, noTalk: true, ghostSolid: true, x: 52, y: 40, z: 0.05, k: 1, shadow: 0.08 };
  }

  // reconhecer: quem é fã (depende da fama) e o que pede (autógrafo, selfie, bola)
  const ACTIVE = []; // quem está na rua agora (de noite tem menos gente)
  function recast() {
    const f = fame();
    const night = C.mode() === 'noite';
    ACTIVE.length = 0;
    PEDS.forEach((p) => {
      if (!(night && p.dayOnly)) ACTIVE.push(p);
      p.fan = p.porter || p.jersey || rnd01(p.i, 11) < (p.small ? Math.min(0.95, f + 0.2) : f);
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
    if (ach.includes('ach_ballon_dor')) L.push('O dono da Bola de Ouro aqui na minha rua!');
    if ((s.careerGoals || 0) >= 10) L.push(`${s.careerGoals} gols... você é um monstro!`);
    if (p.jersey) L.push('Olha a minha camisa: é a sua!');
    if (p.small) L.push(`${sn}!!! Eu quero ser igual a você!`);
    const first = L[Math.floor(rnd01(p.i, 23 + (Hub.t >> 9)) * L.length)];
    const ask = { auto: 'Me dá um autógrafo?', selfie: 'Posso tirar uma selfie?', bola: 'Assina a minha bola?!', oi: 'O prédio inteiro viu o seu jogo!' }[p.req];
    const hi = C.mode() === 'noite' ? 'Boa noite' : C.mode() === 'tarde' ? 'Boa tarde' : 'Bom dia';
    return p.porter ? `${hi}, ${sn}! ${ask}` : `${first} ${ask}`;
  }
  const NOPE = ['Quem é esse?', 'Hm? Acho que já vi essa cara...', 'Com licença!', '(olhando o celular)', 'Opa, desculpa.'];
  const HINT = { auto: 'E: dar autógrafo', selfie: 'E: tirar selfie', bola: 'E: assinar a bola' };
  const who = (p) => (p.porter ? 'PORTEIRO' : p.small ? 'CRIANÇA' : p.jersey ? 'TORCEDOR' : p.fan ? 'FÃ' : 'PEDESTRE');
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

  // um passo da rua (uma vez por tique do mapa)
  let lastT = -1;
  let kt = 0; // relógio da pelada (para quando você entra na quadra)
  let visit = 0;
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
      // reconheceu agora: para, vira para você e acena
      if (p.fan && !p.seen && d < (p.porter ? 3.2 : 3.1) && (!p.kid || inCourt || d < 2.2)) {
        p.seen = true;
        p.st = 'notice';
        p.t0 = t;
        p.line = fanLine(p);
        p.hint = HINT[p.req] || 'E: conversar';
        say(hub, p, p.line, { hint: p.hint, fan: true });
        window.SFX?.blip?.(p.kid ? 1100 : 760);
      } else if (!p.fan && !p.said && d < 1.7) {
        p.said = true;
        if (!hub.bubble || hub.bubble.npc === p.id || d < 1.2) say(hub, p, NOPE[(p.i + visit) % NOPE.length], { until: t + 150 });
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
        // pelada: cada um corre em volta do seu lugar
        const w = kt * 0.021 + p.ph;
        const nx = p.hx + Math.sin(w) * 1.1;
        const ny = p.hy + Math.sin(w * 1.37 + 1) * 0.55;
        if (!inCourt) {
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
    const kids = PEDS.filter((p) => p.kid);
    if (kids.length && !inCourt) {
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
    // o balão fica com o fã mais perto enquanto você está do lado dele (dois fãs juntos: fala
    // quem está mais perto, que é quem o E vai atender)
    if (talk && talkD < 4.2) {
      const cur = hub.bubble && ACTIVE.find((q) => q.id === hub.bubble.npc);
      const busy = cur && cur !== talk && cur.st === 'happy';
      if (!busy && cur !== talk && !talk.done && talk.st !== 'happy' && talk.line) say(hub, talk, talk.line, { hint: talk.hint, fan: true });
      if (hub.bubble && hub.bubble.npc === talk.id) hub.bubble.until = Math.max(hub.bubble.until, t + 30);
    }
  }

  // a lista que o motor desenha (pedestres + a bola)
  const OUT = [];
  C.npcs = function (hub) {
    if (!built) build();
    // (ficou um tempo sem passar pela rua — voltou para casa, jogou uma partida: visita nova)
    if (lastT >= 0 && (hub.t - lastT > 900 || hub.t < lastT)) visit++;
    if (hub._cityVisit !== visit) {
      // (cada visita à rua: os fãs de novo — a fama pode ter mudado)
      hub._cityVisit = visit;
      recast();
    }
    stepPeds(hub);
    OUT.length = 0;
    const t = hub.t;
    ACTIVE.forEach((p) => {
      const view = viewOf(hub, p);
      p.frame = animFrame(p.anim, view, t + p.ph);
      p.ghostSolid = p.kind === 'walk' || p.kid;
      p.ped = true;
      p.z = 0;
      if (p.kind === 'sit') p.z = seatZ(p);
      OUT.push(p);
    });
    if (BALL) {
      BALL.tex = BALL.tex || ballTex();
      OUT.push(BALL);
    }
    return OUT;
  };
  // altura do boneco sentado no banco (assento a 0,42)
  function seatZ(p) {
    const P = PR();
    if (p._seat === undefined) {
      const u = P && P.spriteSeatU ? P.spriteSeatU(p.cd, 'sit') : null;
      p._seat = u === null || u === undefined ? 0.18 : 0.42 - (u * 2 * p.k) / 66;
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
    if (n.ball) return null;
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
    return msg;
  }
  // texto que sobe da cabeça do fã (✍️ / 📸)
  function pop(hub, p, html) {
    const cam = hub.cam3;
    // (sai de cima do balão do fã, para os dois não se taparem)
    const sc = cam && hub.toScreen(cam, p.x, p.y, 1.35 * (p.k / 0.9) + 0.75);
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
      say(hub, p, p.porter ? `Qualquer coisa é só chamar, ${sn}. Boa noite!` : `Valeu de novo, ${sn}! Boa sorte no próximo jogo!`, { until: hub.t + 180 });
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
    const others = ACTIVE.filter((q) => q !== p).map((q) => ({ id: q.id, cd: q.cd, x: q.x, y: q.y, ang: q.ang, anim: q.anim === 'walk' ? 'idle' : q.anim, frame: 0, k: q.k, z: q.z || 0 }));
    const fan = { id: p.id, cd: p.cd, x: sx, y: sy, ang: dir, anim: 'call', k: p.k, frame: 0, view: 'front' };
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

  // entrou na portaria/rua vindo de casa: passa um pedaço do dia, os pedestres de novo e o
  // aviso de que hora é e de quanto a cidade te conhece (uma vez por saída)
  C.onArea = function (hub, a) {
    const inC = C.inCity(a);
    const s = App().state || {};
    if (inC && !hub._inCity) {
      s.cityClock = s.cityClock === undefined ? 0 : s.cityClock + 1;
      visit++;
      hub._cityMsg = false;
      prewarm();
    }
    hub._inCity = inC;
    if ((a !== 'rua' && a !== 'praca') || hub._cityMsg) return;
    hub._cityMsg = true;
    const f = fame();
    window.App?.notify?.(`${C.MODE_NAME[C.mode()]} na cidade • ${Math.round(f * 10)} em cada 10 pessoas te reconhecem (fama ${stars(f)}). Gols e títulos aumentam isso.`, '#f472b6');
  };

  // monta os quadros dos pedestres no tempo livre (sem travar a entrada na rua)
  let warmQ = [];
  function prewarm() {
    if (!built) build();
    if (warmQ.length || !PR() || !PR().spritesV2) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 72;
    const g = cv.getContext('2d');
    PEDS.forEach((p) => {
      const anim = p.jog || p.kid ? 'run' : p.kind === 'walk' ? 'walk' : p.kind === 'sit' ? 'sit' : 'idle';
      ['side', 'front', 'back'].forEach((view) => [false, true].forEach((left) => {
        if (view !== 'side' && left && anim !== 'walk' && anim !== 'run') return;
        warmQ.push([p.cd, { view, left, animState: anim, frame: 0 }]);
      }));
    });
    const pump = (dl) => {
      const t0 = performance.now();
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
    };
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 40)))(pump, { timeout: 300 });
  }

  // (para os testes e para o motor)
  C.peds = () => PEDS;
  C.layout = { FN0, FN1, CURB_N, CURB_S, FS0, FS1, COURT, BANCA, BOARD, BUS, DOOR_X };
  window.HubCidade = C;
})();
