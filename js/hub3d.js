// ============================================================================
// O PRÉDIO DO BLUE LOCK EM 3D (câmera tipo Doom, em 3ª pessoa)
// Um andar inteiro em grade: seu quarto → ala dos quartos → saguão (telão do Ego
// = HISTÓRIA, loja da Anri no canto) → refeitório; ala do treino → academia e
// campo; escada → subsolo (sala das armas).
// Desenho por raios (raycasting) num buffer de pixels pequeno, ampliado sem
// suavizar: paredes texturizadas, chão e teto com luz "assada" (luminárias,
// letreiros, telão), sombra nos cantos, névoa de distância, móveis com volume de
// verdade (caixas com frente, lados e tampo), bonecos e enfeites em pé
// (billboards), sombras redondas no chão, brilho (bloom) no que é aceso e céu
// estrelado no campo. A câmera fica atrás do seu jogador.
// W/S anda, A/D (ou setas) vira, arrastar o mouse vira; no celular, arrastar =
// andar/virar e tocar = interagir. SHIFT corre, E interage, ESC = menu.
// Reaproveita do js/hub.js: interface, menu ☰, janelas das abas, conversas, temas.
// ============================================================================
(function () {
  const Hub = window.Hub;
  if (!Hub) return;
  const PR = () => window.PixelRenderer;
  const sh = (c, k) => PR().shade(c, k);
  const rgb = (c) => Hub.rgbOf(c);
  const WALL_H = 1.75; // altura das paredes (ladrilhos)
  const CAM_Z = 1.28; // altura da câmera (acima da cabeça do seu jogador)
  let CZ = CAM_Z; // altura da câmera neste quadro (sobe um pouco quando ela chega perto de você)
  const HZK = 0.32; // horizonte acima do meio = câmera olhando um pouco para baixo
  const FOC = 0.92;
  const TW = 64; // textura de parede: 64 px por ladrilho na largura
  const TH = 96; // ... e 96 px na altura toda
  const FTX = 32; // chão assado: 32 texels por ladrilho
  const CTX = 16; // teto assado: 16 texels por ladrilho
  const LM = 8; // mapa de luz: 8 amostras por ladrilho
  const SPX = 66; // px da arte 2D por ladrilho (bonecos e enfeites em pé)
  const MW = 62;
  // A grade tem 80 linhas, mas o prédio usa só as 34 primeiras (BH). As outras 46 são a
  // cidade (rua do prédio, avenida, calçadão, rua das torres e parque), que só existe da
  // carreira profissional em diante (js/hub3d_cidade.js): nos outros temas elas ficam maciças
  // e o chão/luz/teto são montados só até a linha 34 (map.rows), então a cidade não custa
  // nada (nem memória) fora dessas fases. (chão assado: 62*32 x 80*32 = 1984 x 2560 texels)
  const MH = 80;
  const BH = 34;
  const CAM_BACK = 2.8;
  const NEAR = 0.06;

  // (as áreas novas entram sempre no fim: os índices das antigas não mudam)
  const AREA_IDS = ['quarto', 'dorm', 'saguao', 'refeitorio', 'treino', 'academia', 'campo', 'subsolo', 'armas', 'vestiario', 'portaria', 'rua', 'praca', 'avenida', 'comercio', 'torres', 'parque'];
  const AREAS = {
    quarto: { name: 'SEU QUARTO', floor: 'carpet', wall: 'warm' },
    dorm: { name: 'ALA DOS QUARTOS', floor: 'tile', wall: 'panel' },
    saguao: { name: 'SAGUÃO', floor: 'tileBig', wall: 'panel' },
    refeitorio: { name: 'REFEITÓRIO', floor: 'tileL', wall: 'kitchen' },
    treino: { name: 'ALA DO TREINO', floor: 'tile', wall: 'panel' },
    academia: { name: 'ACADEMIA', floor: 'mat', wall: 'gym' },
    campo: { name: 'CAMPO DE TREINO', floor: 'turf', wall: 'arena' },
    subsolo: { name: 'ESCADA • SUBSOLO', floor: 'stairs', wall: 'concrete' },
    armas: { name: 'SALA DAS ARMAS', floor: 'metal', wall: 'dark' },
    vestiario: { name: 'VESTIÁRIO', floor: 'tile', wall: 'panel' },
    // a cidade (só no tema pro): o chão delas é desenhado pelo js/hub3d_cidade.js
    portaria: { name: 'PORTARIA DO PRÉDIO', floor: 'tileBig', wall: 'panel' },
    rua: { name: 'RUA DA VITÓRIA', floor: 'tile', wall: 'city' },
    praca: { name: 'PRAÇA DA QUADRA', floor: 'tile', wall: 'city' },
    avenida: { name: 'AVENIDA DOS CAMPEÕES', floor: 'tile', wall: 'city' },
    comercio: { name: 'CALÇADÃO DO COMÉRCIO', floor: 'tile', wall: 'city' },
    torres: { name: 'RUA DAS TORRES', floor: 'tile', wall: 'city' },
    parque: { name: 'PARQUE DO LAGO', floor: 'tile', wall: 'city' }
  };
  // a cidade a céu aberto (ruas, praça e parque): a luz de um poste passa de uma para a outra
  const CITY_OUT = ['rua', 'praca', 'avenida', 'comercio', 'torres', 'parque'];
  // áreas a céu aberto: sem teto (céu com estrelas), sem a grade de luminárias e sem poeira
  const OPEN = Uint8Array.from(AREA_IDS, (id) => (id === 'campo' || CITY_OUT.includes(id) ? 1 : 0));
  // o conteúdo da cidade (layout, fachadas, pedestres e fãs) mora em js/hub3d_cidade.js
  const CITY = () => window.HubCidade || null;
  // portas entre as áreas: a viga em cima mostra para onde ela leva (de cada lado)
  const DOORS = [
    { x: 16, y: 13, a: 'refeitorio', W: 'SAGUAO', E: 'REFEITORIO' },
    { x: 16, y: 19, a: 'dorm', W: 'SAGUAO', E: 'QUARTOS' },
    { x: 12, y: 21, a: 'quarto', N: 'SEU QUARTO', S: 'CORREDOR' },
    { x: 33, y: 14, a: 'treino', W: 'TREINO', E: 'SAGUAO' },
    { x: 38, y: 12, a: 'academia', N: 'CORREDOR', S: 'ACADEMIA' },
    { x: 44, y: 14, a: 'campo', W: 'CAMPO', E: 'TREINO' },
    { x: 27, y: 21, a: 'subsolo', N: 'SUBSOLO', S: 'SAGUAO' },
    { x: 38, y: 16, a: 'vestiario', N: 'VESTIARIO', S: 'CORREDOR' }
  ];

  // ---------------------------------------------------------------- utilidades
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  const R = (g, x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const pk = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  // textura = pixels (Uint32 no formato do ImageData) + máscara do que é aceso
  function texOf(cv, ev) {
    const id = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    const px = new Uint32Array(id.data.buffer);
    let em = null;
    if (ev) {
      const e = ev.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < px.length; i++) {
        if (e[i * 4 + 3] > 40) {
          if (!em) em = new Uint8Array(px.length);
          em[i] = 1;
        }
      }
    }
    return { w: cv.width, h: cv.height, px, em };
  }
  // (a textura sai do canvas por getImageData: canvas na memória, sem ler de volta da placa de
  // vídeo a cada textura — no celular cada leitura custava vários ms ao montar o prédio)
  const RF = { willReadFrequently: true };
  function makeTex(w, h, draw) {
    const cv = canvas(w, h);
    const ev = canvas(w, h);
    const g = cv.getContext('2d', RF);
    const e = ev.getContext('2d', RF);
    g.imageSmoothingEnabled = false;
    draw(g, e, cv.width, cv.height);
    return texOf(cv, ev);
  }
  // igual ao makeTex, mas reaproveita o mesmo par de canvas (texturas que mudam toda hora)
  const TEXCV = new Map();
  function makeTexReuse(w, h, draw) {
    const k = Math.round(w) + 'x' + Math.round(h);
    let p = TEXCV.get(k);
    if (!p) TEXCV.set(k, (p = [canvas(w, h), canvas(w, h)]));
    const [cv, ev] = p;
    const g = cv.getContext('2d', RF);
    const e = ev.getContext('2d', RF);
    g.save();
    e.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    e.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    e.clearRect(0, 0, ev.width, ev.height);
    g.imageSmoothingEnabled = false;
    try {
      draw(g, e, cv.width, cv.height);
    } finally {
      g.restore();
      e.restore();
    }
    return texOf(cv, ev);
  }
  function charCd(id) {
    if (id === 'EGO') return window.CutsceneEngine?.getSpeakerCharData?.('JINPACHI EGO') || null;
    if (id === 'anri' || id === 'ANRI') return window.CutsceneEngine?.getSpeakerCharData?.('ANRI') || null;
    const c = (window.BLUE_LOCK_CHARACTERS || []).find((x) => x.id === id);
    return c ? Object.assign({}, c, { jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8' }) : null;
  }
  const txt = (g, s, x, y, c, k = 1, al = 'center') => Hub.ptext(g, s, x, y, c, k, al);
  const noAcc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  // ---------------------------------------------------------------- mapa
  // duas versões da planta: 'base' (o prédio) e 'city' (o prédio + a portaria e a cidade ao
  // sul do apartamento, só no tema pro). Cada uma é montada uma vez e reaproveitada.
  const MAPS = {};
  // a cidade abre quando você vira profissional (tema pro) e continua em todos os capítulos
  // depois disso (convocação, Copa, final): th.city vem do js/hub.js (themeFor)
  const cityOf = (th) => !!(th && (th.id === 'pro' || th.city) && CITY());
  function mapFor(th) {
    const v = cityOf(th) ? 'city' : 'base';
    return MAPS[v] || (MAPS[v] = buildMap(v === 'city'));
  }
  function buildMap(city) {
    const solid = new Uint8Array(MW * MH).fill(1);
    const area = new Int8Array(MW * MH).fill(-1);
    const carve = (id, x0, y0, x1, y1) => {
      const a = AREA_IDS.indexOf(id);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        solid[y * MW + x] = 0;
        area[y * MW + x] = a;
      }
    };
    carve('saguao', 17, 9, 32, 20);
    carve('refeitorio', 4, 7, 15, 14);
    carve('dorm', 2, 18, 15, 20);
    carve('quarto', 9, 22, 15, 29);
    carve('treino', 34, 13, 43, 15);
    carve('academia', 35, 6, 42, 11);
    carve('campo', 45, 6, 60, 22);
    carve('subsolo', 26, 22, 28, 25);
    carve('armas', 22, 26, 32, 32);
    carve('vestiario', 35, 17, 42, 22);
    DOORS.forEach((d) => carve(d.a, d.x, d.y, d.x, d.y));
    // pilares do saguão (2 = pilar)
    [[21, 13], [28, 13], [21, 17], [28, 17]].forEach(([x, y]) => (solid[y * MW + x] = 2));
    // faces especiais das paredes: face[idx][N|S|E|W] (N = a face do lado norte da parede)
    const face = {};
    const F = (x, y, dir, kind) => ((face[y * MW + x] = face[y * MW + x] || {})[dir] = kind);
    // saguão
    [17, 18, 19].forEach((x) => F(x, 8, 'S', 'shelf'));
    F(20, 8, 'S', 'neon:LOJA:#f472b6');
    F(22, 8, 'S', 'poster:EGO');
    [23, 24, 25, 26].forEach((x, i) => F(x, 8, 'S', `screen:${i}`));
    F(27, 8, 'S', 'poster:rin');
    F(29, 8, 'S', 'logo');
    F(30, 8, 'S', 'poster:nagi');
    F(31, 8, 'S', 'poster:bachira');
    [9, 10, 11].forEach((y) => F(16, y, 'E', 'shelf'));
    F(16, 15, 'E', 'board');
    F(16, 16, 'E', 'poster:kunigami');
    F(16, 20, 'E', 'logo');
    F(33, 10, 'W', 'window');
    F(33, 11, 'W', 'window');
    F(33, 16, 'W', 'poster:barou');
    F(17, 21, 'N', 'poster:chigiri');
    F(23, 21, 'N', 'board');
    F(26, 21, 'N', 'arrow:SUBSOLO');
    F(30, 21, 'N', 'poster:isagi');
    F(31, 21, 'N', 'logo');
    // ala dos quartos: portas dos outros (trancadas)
    [[3, 21, 'N', 'QUARTO 1'], [6, 21, 'N', 'QUARTO 2'], [9, 21, 'N', 'QUARTO 3'], [15, 21, 'N', 'QUARTO 5'], [4, 17, 'S', 'QUARTO 6'], [8, 17, 'S', 'QUARTO 7'], [12, 17, 'S', 'QUARTO 8']].forEach(([x, y, d, l]) => F(x, y, d, `door:${l}`));
    F(6, 17, 'S', 'poster:kunigami');
    F(10, 17, 'S', 'poster:chigiri');
    F(14, 17, 'S', 'board');
    F(1, 18, 'E', 'window');
    F(1, 19, 'E', 'logo');
    F(1, 20, 'E', 'window');
    F(13, 21, 'N', 'plate:QUARTO 4');
    // seu quarto
    F(16, 23, 'W', 'lockers');
    F(16, 24, 'W', 'lockers');
    F(10, 30, 'N', 'board');
    F(11, 30, 'N', 'board2');
    F(8, 23, 'E', 'poster:EGO');
    F(8, 26, 'E', 'window');
    F(8, 28, 'E', 'poster:isagi');
    F(16, 28, 'W', 'window');
    F(13, 21, 'S', 'trophy');
    F(14, 21, 'S', 'trophy');
    // refeitório
    [5, 6, 7, 8, 9, 10].forEach((x, i) => F(x, 6, 'S', i % 3 === 1 ? 'menu' : 'kitchen'));
    F(3, 10, 'E', 'tv');
    F(3, 12, 'E', 'poster:gagamaru');
    F(3, 8, 'E', 'window');
    F(6, 15, 'N', 'poster:bachira');
    F(10, 15, 'N', 'board');
    F(14, 15, 'N', 'logo');
    // ala do treino
    [35, 36, 37, 39, 40, 41, 42].forEach((x) => F(x, 16, 'N', 'window'));
    F(35, 12, 'S', 'poster:barou');
    F(36, 12, 'S', 'board');
    F(40, 12, 'S', 'poster:chigiri');
    F(42, 12, 'S', 'arrow:CAMPO');
    // academia
    [36, 37, 38, 39, 40, 41].forEach((x) => F(x, 5, 'S', 'mirror'));
    F(43, 10, 'W', 'poster:kunigami');
    F(34, 8, 'E', 'logo');
    F(34, 10, 'E', 'board');
    // campo
    F(52, 5, 'S', 'logo');
    F(53, 5, 'S', 'logo');
    // subsolo e sala das armas
    F(25, 23, 'E', 'arrow:ARMAS');
    F(29, 24, 'W', 'arrow:ARMAS');
    F(24, 25, 'S', 'neon:ROLETA:#facc15');
    F(25, 25, 'S', 'neon:ARMAS:#facc15');
    F(30, 25, 'S', 'neon:FLUXO:#c084fc');
    F(31, 25, 'S', 'logo');
    F(21, 29, 'E', 'logo');
    F(33, 29, 'W', 'logo');
    // vestiário: armários em volta, quadro tático e o logo no fundo
    [35, 36, 37, 39, 40, 41, 42].forEach((x) => F(x, 16, 'S', 'lockers'));
    [17, 18, 20, 21, 22].forEach((y) => {
      F(34, y, 'E', 'lockers');
      F(43, y, 'W', 'lockers');
    });
    F(34, 19, 'E', 'logo');
    F(43, 19, 'W', 'board');
    F(36, 23, 'N', 'poster:EGO');
    F(38, 23, 'N', 'board2');
    F(39, 23, 'N', 'board');
    F(41, 23, 'N', 'logo');
    // rows = quantas linhas têm chão/luz/teto montados (ver BH)
    const m = { solid, area, face, rows: BH, city: false };
    if (city && CITY()) {
      CITY().carve({ carve, F, solid, area, MW, MH, AREA_IDS });
      m.rows = MH;
      m.city = true;
    }
    return m;
  }

  // ---------------------------------------------------------------- texturas de parede
  function wallColor(th, style) {
    if (style === 'warm') return th.home ? (th.id === 'school' ? '#5a4636' : '#3b2f2a') : sh(th.wall, 0.1);
    if (style === 'kitchen') return '#94a3b8';
    if (style === 'gym') return '#111827';
    if (style === 'arena') return '#0b1220';
    if (style === 'concrete') return '#3f3f46';
    if (style === 'dark') return '#0b0a14';
    return th.wall;
  }
  function wallBase(g, e, th, style) {
    if (style === 'city') {
      // a cidade: pedra escura em blocos (quase tudo fica atrás das fachadas)
      R(g, 0, 0, TW, TH, '#2a2522');
      for (let y = 0; y < TH; y += 12) {
        R(g, 0, y, TW, 1, '#1c1917');
        for (let x = (y / 12) % 2 ? 0 : 16; x < TW; x += 32) R(g, x, y, 1, 12, '#1c1917');
      }
      R(g, 0, TH - 6, TW, 6, '#1c1917');
      return;
    }
    const wall = wallColor(th, style);
    R(g, 0, 0, TW, TH, wall);
    if (style === 'kitchen') {
      R(g, 0, 0, TW, 40, '#94a3b8');
      for (let y = 44; y < TH - 8; y += 8) for (let x = 0; x < TW; x += 8) R(g, x, y, 7, 7, (x + y) % 16 ? '#e2e8f0' : '#f1f5f9');
      R(g, 0, 40, TW, 4, '#f59e0b');
      R(g, 0, TH - 8, TW, 8, '#475569');
      return;
    }
    if (style === 'concrete') {
      for (let i = 0; i < 60; i++) R(g, (i * 37) % TW, (i * 53) % TH, 2 + (i % 3), 1 + (i % 2), i % 2 ? '#52525b' : '#27272a');
      R(g, 0, 32, TW, 1, '#27272a');
      R(g, 0, 64, TW, 1, '#27272a');
      R(g, 0, TH - 10, TW, 10, '#27272a');
      for (let x = -8; x < TW; x += 12) {
        g.fillStyle = '#facc15';
        g.beginPath();
        g.moveTo(x, TH - 10);
        g.lineTo(x + 6, TH - 10);
        g.lineTo(x + 12, TH);
        g.lineTo(x + 6, TH);
        g.fill();
      }
      return;
    }
    if (style === 'arena' && th.id === 'bluelock') {
      // Blue Lock: o campo é fechado dentro do prédio (sem arquibancada): parede de
      // instalação em placas, faixa de luz e o painel de LED com o nome embaixo
      R(g, 0, 0, TW, TH, sh(th.wall, -0.15));
      for (let x = 0; x < TW; x += 16) {
        R(g, x, 0, 1, 58, sh(th.wall, -0.45));
        R(g, x + 1, 0, 1, 58, sh(th.wall, 0.1));
      }
      R(g, 0, 18, TW, 1, sh(th.wall, -0.4));
      R(g, 0, 38, TW, 1, sh(th.wall, -0.4));
      R(g, 0, 8, TW, 2, th.acc);
      R(e, 0, 8, TW, 2, '#fff');
      R(g, 0, 58, TW, 2, '#cbd5e1');
      R(g, 0, 60, TW, 26, '#020617');
      R(g, 0, 62, TW, 22, sh(th.acc2, -0.3));
      R(g, 0, 62, TW, 2, th.acc);
      txt(g, 'BLUE LOCK', 32, 70, '#f8fafc', 1);
      R(e, 0, 62, TW, 22, '#fff');
      R(g, 0, TH - 10, TW, 10, '#14532d');
      return;
    }
    if (style === 'arena') {
      // arquibancada (cadeiras em fileiras) e placas de LED embaixo
      R(g, 0, 0, TW, TH, '#0b1220');
      for (let r = 0; r < 6; r++) {
        const y = 4 + r * 9;
        R(g, 0, y + 6, TW, 3, '#1e293b');
        for (let x = (r % 2) * 4; x < TW; x += 8) {
          const c = (x / 8 + r) % 5 === 0 ? th.acc : r % 2 ? sh(th.acc2, -0.2) : sh(th.acc2, -0.45);
          R(g, x + 1, y, 6, 6, c);
          R(g, x + 1, y, 6, 1, sh(c, 0.3));
        }
      }
      R(g, 0, 58, TW, 2, '#cbd5e1');
      R(g, 0, 60, TW, 26, '#020617');
      R(g, 0, 62, TW, 22, sh(th.acc2, -0.3));
      R(g, 0, 62, TW, 2, th.acc);
      txt(g, noAcc(th.ad || 'EGOIST').slice(0, 14), 32, 70, '#f8fafc', 1);
      R(e, 0, 62, TW, 22, '#fff');
      R(g, 0, TH - 10, TW, 10, '#14532d');
      return;
    }
    // painéis com frisos, rodapé e faixa de LED no alto
    for (let x = 0; x < TW; x += 32) {
      R(g, x, 0, 1, TH, sh(wall, -0.3));
      R(g, x + 1, 0, 1, TH, sh(wall, 0.12));
    }
    R(g, 0, 50, TW, 1, sh(wall, 0.15));
    R(g, 0, 51, TW, 1, sh(wall, -0.25));
    if (style === 'warm') {
      const wood = th.home ? '#5b3a24' : sh(th.acc2, -0.55);
      R(g, 0, 52, TW, TH - 60, wood);
      for (let x = 0; x < TW; x += 16) R(g, x, 52, 1, TH - 60, sh(wood, -0.3));
      R(g, 0, 52, TW, 2, sh(wood, 0.25));
    }
    if (style === 'gym') {
      R(g, 0, 52, TW, 4, th.acc);
      R(g, 0, 56, TW, TH - 64, '#1f2937');
      R(e, 0, 52, TW, 4, '#fff');
    }
    R(g, 0, TH - 8, TW, 8, sh(wall, -0.4));
    R(g, 0, TH - 8, TW, 1, sh(wall, 0.2));
    const led = style === 'dark' ? '#a855f7' : th.led;
    R(g, 0, 5, TW, 2, led);
    R(g, 0, 7, TW, 1, sh(led, -0.5));
    R(e, 0, 5, TW, 2, '#fff');
    if (style === 'dark') {
      R(g, 0, TH - 9, TW, 1, '#a855f7');
      R(e, 0, TH - 9, TW, 1, '#fff');
    }
  }
  function drawPoster(g, x, y, w, h, id, th) {
    const col = { rin: '#065f46', EGO: '#1e293b', bachira: '#a16207', nagi: '#475569', kunigami: '#c2410c', chigiri: '#be123c', gagamaru: '#166534', barou: '#3f3f46', isagi: '#1d4ed8' }[id] || th.acc2;
    R(g, x - 1, y - 1, w + 2, h + 2, '#020617');
    R(g, x, y, w, h, col);
    R(g, x + 2, y + 2, w - 4, h - 14, sh(col, -0.45));
    const cd = charCd(id);
    if (cd) {
      g.save();
      g.beginPath();
      g.rect(x + 2, y + 2, w - 4, h - 14);
      g.clip();
      const s = Math.round(w * 1.7);
      g.translate(Math.round(x + w / 2 - s / 2), Math.round(y - s * 0.08));
      PR().drawCharacterSprite(g, cd, s, s, { facing: 'front', frame: 1, animState: 'idle', view: 'front' });
      g.restore();
    }
    R(g, x, y + h - 12, w, 12, sh(col, -0.2));
    txt(g, id === 'EGO' ? 'EGO' : id.toUpperCase().slice(0, 8), x + w / 2, y + h - 9, '#f8fafc', 1);
  }
  // Campo coberto: 'upper' = parede alta (placas escuras, frisos, faixa de luz e uma fileira
  // de refletores no alto); 'roof' = placa do teto com uma luminária acesa no meio
  function makeFieldRoofTex(kind, th) {
    const base = sh(th.wall, -0.25);
    // estádio (Seleção / Copa / liga): torcida nas fileiras e o piso dos degraus
    if (kind === 'tread') return makeTex(8, 8, (g) => R(g, 0, 0, 8, 8, '#1f2430'));
    if (kind === 'crowd') {
      return makeTex(TW, TH, (g, e) => {
        R(g, 0, 0, TW, TH, '#141822');
        // fileiras de cadeiras com gente (cabeça, corpo); uma fileira a cada 12 px
        let s = 7 + th.acc.length * 13;
        const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
        const shirts = [th.acc, th.acc2, '#f8fafc', th.acc, '#1e3a8a', '#f8fafc', th.acc2, '#facc15'];
        const skins = ['#f1c9a5', '#d9a77f', '#8d5a3b', '#f3d6bd'];
        for (let r = 0; r < 8; r++) {
          const y = 4 + r * 12;
          R(g, 0, y + 9, TW, 2, '#0b0e14');
          for (let x = (r % 2) * 2; x < TW; x += 4) {
            if (rnd() < 0.08) continue; // lugar vazio
            const c = shirts[Math.floor(rnd() * shirts.length)];
            const up = rnd() < 0.15 ? 2 : 0; // braço levantado / de pé
            R(g, x, y + 4 - up, 3, 5 + up, c);
            R(g, x + 0.5, y + 1 - up, 2, 3, skins[Math.floor(rnd() * skins.length)]);
            if (up && rnd() < 0.5) R(g, x + 1, y - 3, 1, 3, c);
          }
        }
        // faixa de LED no pé de cada degrau
        R(g, 0, TH - 6, TW, 6, '#020617');
        R(g, 0, TH - 5, TW, 4, sh(th.acc, -0.15));
        R(e, 0, TH - 5, TW, 4, '#fff');
      });
    }
    if (kind === 'roof') {
      return makeTex(64, 64, (g, e) => {
        R(g, 0, 0, 64, 64, sh(base, -0.2));
        R(g, 0, 0, 64, 1, sh(base, 0.12));
        R(g, 0, 0, 1, 64, sh(base, 0.12));
        R(g, 31, 0, 2, 64, sh(base, -0.35));
        R(g, 0, 31, 64, 2, sh(base, -0.35));
        R(g, 18, 18, 28, 28, '#0b1220');
        R(g, 20, 20, 24, 24, '#e0f2fe');
        R(e, 20, 20, 24, 24, '#fff');
      });
    }
    return makeTex(TW, TH, (g, e) => {
      R(g, 0, 0, TW, TH, base);
      for (let x = 0; x < TW; x += 16) {
        R(g, x, 0, 1, TH, sh(base, -0.45));
        R(g, x + 1, 0, 1, TH, sh(base, 0.12));
      }
      for (let y = 24; y < TH; y += 24) R(g, 0, y, TW, 1, sh(base, -0.4));
      R(g, 0, 46, TW, 3, th.acc);
      R(e, 0, 46, TW, 3, '#fff');
      // refletores (a textura se repete a cada 1,75 de altura: três fileiras até o teto)
      for (let x = 6; x < TW; x += 16) {
        R(g, x, 10, 6, 4, '#f8fafc');
        R(e, x, 10, 6, 4, '#fff');
      }
    });
  }
  function makeWallTex(kind, th, style) {
    // campo coberto (Blue Lock / NEL): a parede alta acima da arquibancada e o teto
    if (kind === 'upper' || kind === 'roof' || kind === 'crowd' || kind === 'tread') return makeFieldRoofTex(kind, th);
    return makeTex(TW, TH, (g, e) => {
      wallBase(g, e, th, style);
      const [k, a1, a2] = kind.split(':');
      if (k === 'door') {
        R(g, 12, 16, 40, TH - 24, '#020617');
        R(g, 14, 18, 36, TH - 26, th.metal);
        R(g, 14, 18, 36, 2, sh(th.metal, 0.3));
        R(g, 31, 18, 2, TH - 26, sh(th.metal, -0.4));
        R(g, 18, 26, 10, 16, '#0b1220');
        R(g, 19, 27, 8, 14, sh(th.acc2, -0.3));
        R(g, 36, 56, 3, 9, '#e5e7eb');
        R(g, 15, 8, 34, 8, '#0b1220');
        txt(g, a1, 32, 9, '#94a3b8', 1);
        txt(e, a1, 32, 9, '#fff', 1);
        R(g, 43, 46, 4, 3, '#ef4444');
        R(e, 43, 46, 4, 3, '#fff');
      } else if (k === 'neon') {
        const c = a2 || th.acc;
        R(g, 3, 18, TW - 6, 22, '#020617');
        R(g, 4, 19, TW - 8, 20, sh(c, -0.75));
        const s = a1.length * 8 <= TW - 10 ? 2 : 1;
        txt(g, a1, 32, 29 - s * 2.5, c, s);
        txt(e, a1, 32, 29 - s * 2.5, '#fff', s);
        R(g, 4, 19, TW - 8, 1, c);
        R(g, 4, 38, TW - 8, 1, c);
        R(e, 4, 19, TW - 8, 1, '#fff');
        R(e, 4, 38, TW - 8, 1, '#fff');
      } else if (k === 'arrow' || k === 'plate') {
        R(g, 6, 24, 52, 14, '#020617');
        R(g, 7, 25, 50, 12, '#0f172a');
        txt(g, a1, k === 'arrow' ? 28 : 32, 29, '#e2e8f0', 1);
        if (k === 'arrow') {
          g.fillStyle = th.acc;
          g.beginPath();
          g.moveTo(50, 27);
          g.lineTo(54, 31);
          g.lineTo(50, 35);
          g.fill();
          R(e, 48, 27, 7, 9, '#fff');
        }
        txt(e, a1, k === 'arrow' ? 28 : 32, 29, '#fff', 1);
      } else if (k === 'shelf') {
        R(g, 2, 12, 60, TH - 20, '#3b1d0a');
        for (let r = 0; r < 4; r++) {
          const y = 16 + r * 17;
          R(g, 4, y + 13, 56, 2, '#92400e');
          R(g, 4, y + 13, 56, 1, '#b45309');
          for (let i = 0; i < 7; i++) {
            const c = ['#ef4444', '#facc15', '#38bdf8', '#a855f7', '#22c55e', '#f97316', '#e2e8f0'][(i + r * 2) % 7];
            const hh = 9 + ((i + r) % 3);
            R(g, 6 + i * 8, y + 13 - hh, 6, hh, c);
            R(g, 6 + i * 8, y + 13 - hh, 6, 1, sh(c, 0.4));
            R(g, 7 + i * 8, y + 16 - hh, 4, 2, '#f8fafc');
          }
        }
      } else if (k === 'lockers') {
        for (let i = 0; i < 2; i++) {
          const x = 3 + i * 30;
          R(g, x, 12, 28, TH - 20, '#020617');
          R(g, x + 1, 13, 26, TH - 22, th.metal);
          R(g, x + 1, 13, 26, 3, th.acc);
          for (let j = 0; j < 4; j++) R(g, x + 5, 22 + j * 3, 18, 1, sh(th.metal, -0.35));
          R(g, x + 21, 50, 2, 9, '#e5e7eb');
          txt(g, i ? '08' : '07', x + 14, 38, '#f8fafc', 1);
          R(e, x + 1, 13, 26, 3, '#fff');
        }
      } else if (k === 'board' || k === 'board2') {
        R(g, 6, 20, 52, 38, '#3b1d0a');
        R(g, 8, 22, 48, 34, '#b45309');
        const notes = k === 'board' ? [[3, 3, '#fef08a'], [16, 5, '#f8fafc'], [30, 2, '#bae6fd'], [6, 18, '#fecaca'], [21, 19, '#fef08a'], [34, 17, '#f8fafc']] : [[4, 4, '#f8fafc'], [20, 3, '#fef08a'], [34, 6, '#bbf7d0'], [10, 19, '#bae6fd'], [27, 18, '#fecaca']];
        notes.forEach(([dx, dy, c]) => {
          R(g, 8 + dx, 22 + dy, 11, 12, c);
          R(g, 10 + dx, 26 + dy, 7, 1, '#64748b');
          R(g, 10 + dx, 29 + dy, 5, 1, '#64748b');
          R(g, 12 + dx, 21 + dy, 2, 2, '#ef4444');
        });
      } else if (k === 'trophy') {
        R(g, 4, 24, 56, 3, '#57534e');
        R(g, 4, 48, 56, 3, '#57534e');
        [[10, 13, '#facc15'], [27, 15, '#cbd5e1'], [44, 13, '#f97316'], [14, 37, '#facc15'], [32, 39, '#38bdf8'], [46, 38, '#a3e635']].forEach(([x, y, c]) => {
          R(g, x, y, 8, 6, c);
          R(g, x - 2, y + 1, 2, 3, c);
          R(g, x + 8, y + 1, 2, 3, c);
          R(g, x + 3, y + 6, 2, 3, sh(c, -0.3));
          R(g, x + 1, y + 9, 6, 2, '#57534e');
          R(g, x + 1, y, 2, 4, sh(c, 0.5));
        });
      } else if (k === 'poster') {
        drawPoster(g, 14, 14, 36, 52, a1, th);
      } else if (k === 'logo') {
        R(g, 12, 16, 40, 42, '#020617');
        R(g, 13, 17, 38, 40, sh(th.acc2, -0.5));
        // símbolo de cada fase: cadeado (Blue Lock/NEL), sol (seleção), taça (Copa), bola
        const icon = th.icon || 'lock';
        for (const [c, col] of [[g, th.acc], [e, '#fff']]) {
          c.fillStyle = col;
          c.strokeStyle = col;
          c.lineWidth = 3;
          if (icon === 'lock') {
            c.beginPath();
            c.arc(32, 32, 7, Math.PI, 0);
            c.stroke();
            c.fillRect(23, 32, 18, 13);
          } else if (icon === 'sun') {
            c.fillStyle = c === g ? '#f8fafc' : '#fff';
            c.fillRect(18, 22, 28, 20);
            c.fillStyle = col;
            c.beginPath();
            c.arc(32, 32, 6, 0, Math.PI * 2);
            c.fill();
          } else if (icon === 'cup') {
            c.fillRect(25, 22, 14, 10);
            c.fillRect(21, 23, 4, 5);
            c.fillRect(39, 23, 4, 5);
            c.fillRect(30, 32, 4, 6);
            c.fillRect(25, 38, 14, 4);
          } else {
            c.beginPath();
            c.arc(32, 32, 9, 0, Math.PI * 2);
            c.fill();
          }
        }
        if (icon === 'lock') R(g, 31, 36, 2, 5, '#020617');
        if (icon === 'ball') {
          R(g, 30, 30, 5, 5, '#020617');
          R(g, 25, 26, 3, 3, '#020617');
          R(g, 37, 36, 3, 3, '#020617');
        }
        txt(g, noAcc(th.logo || th.name).slice(0, 9), 32, 49, '#e0f2fe', 1);
      } else if (k === 'kitchen' || k === 'menu') {
        if (k === 'menu') {
          R(g, 6, 8, 52, 26, '#0b1220');
          txt(g, 'CARDAPIO', 32, 11, '#fbbf24', 1);
          R(g, 10, 18, 44, 1, '#fbbf24');
          ['ARROZ', 'FRANGO', 'SALADA'].forEach((s, i) => txt(g, s, 10, 21 + i * 4, '#e2e8f0', 1, 'left'));
          R(e, 6, 8, 52, 26, '#fff');
        } else {
          // prateleira com panelas
          R(g, 4, 22, 56, 2, '#64748b');
          [[8, '#cbd5e1'], [24, '#94a3b8'], [42, '#e2e8f0']].forEach(([x, c]) => {
            R(g, x, 14, 12, 8, c);
            R(g, x - 2, 14, 16, 2, sh(c, 0.3));
          });
        }
      } else if (k === 'tv') {
        R(g, 4, 16, 56, 36, '#020617');
        R(g, 6, 18, 52, 32, '#052e16');
        R(g, 8, 30, 48, 18, '#15803d');
        R(g, 32, 30, 1, 18, '#bbf7d0');
        R(g, 20, 36, 2, 2, '#f8fafc');
        R(g, 40, 40, 2, 2, '#ef4444');
        txt(g, 'AO VIVO', 32, 21, '#f8fafc', 1);
        R(g, 10, 21, 3, 3, '#ef4444');
        R(e, 6, 18, 52, 32, '#fff');
      } else if (k === 'window') {
        const sky = th.window === 'city' ? '#7c2d12' : th.window === 'sunset' ? '#f97316' : '#0c1a3a';
        R(g, 4, 12, 56, 48, '#020617');
        R(g, 6, 14, 52, 44, sky);
        if (th.window === 'sunset') {
          // fim de tarde: céu laranja, sol baixo e o campo do colégio
          R(g, 6, 14, 52, 10, '#7c3aed');
          R(g, 6, 24, 52, 8, '#db2777');
          R(g, 34, 30, 12, 8, '#fde68a');
          R(g, 36, 28, 8, 2, '#fde68a');
          R(g, 6, 40, 52, 18, '#3f6212');
          for (let x = 6; x < 58; x += 8) R(g, x, 40, 4, 18, '#4d7c0f');
          R(g, 6, 44, 52, 1, '#fef3c7');
        } else if (th.window === 'city') {
          // cidade à noite
          for (let i = 0; i < 7; i++) {
            const bh = 10 + ((i * 7) % 18);
            R(g, 6 + i * 8, 58 - bh, 7, bh, '#1c1917');
            for (let j = 0; j < bh - 4; j += 4) if ((i + j) % 3) R(g, 8 + i * 8, 60 - bh + j, 2, 2, '#fde68a');
          }
        } else {
          R(g, 6, 40, 52, 18, '#14532d');
          for (let x = 6; x < 58; x += 8) R(g, x, 40, 4, 18, '#166534');
          R(g, 6, 44, 52, 1, '#bbf7d0');
          R(g, 12, 17, 3, 3, '#fef9c3');
          R(g, 48, 17, 3, 3, '#fef9c3');
          [[20, 20], [34, 16], [42, 24], [26, 28]].forEach(([x, y]) => R(g, x, y, 1, 1, '#e0f2fe'));
        }
        R(g, 31, 14, 2, 44, '#020617');
        R(g, 6, 36, 52, 1, '#020617');
        R(g, 7, 15, 10, 1, 'rgba(255,255,255,0.35)');
        R(e, 6, 14, 52, 44, '#fff');
      } else if (k === 'mirror') {
        R(g, 2, 10, 60, TH - 20, '#0f172a');
        R(g, 4, 12, 56, TH - 24, '#334155');
        R(g, 4, 12, 56, TH - 24, 'rgba(148,163,184,0.25)');
        R(g, 10, 16, 4, TH - 32, 'rgba(255,255,255,0.22)');
        R(g, 18, 16, 2, TH - 32, 'rgba(255,255,255,0.12)');
      } else if (k === 'pillar') {
        R(g, 0, 0, TW, TH, sh(th.wall, 0.05));
        R(g, 0, 0, 3, TH, sh(th.wall, 0.3));
        R(g, TW - 3, 0, 3, TH, sh(th.wall, -0.35));
        R(g, 8, 30, 48, 30, '#020617');
        R(g, 9, 31, 46, 28, sh(th.acc2, -0.4));
        txt(g, th.pillar || 'EGO', 32, 38, th.acc, 2);
        txt(e, th.pillar || 'EGO', 32, 38, '#fff', 2);
        R(g, 0, 5, TW, 2, th.led);
        R(e, 0, 5, TW, 2, '#fff');
      } else if (CITY()) {
        // paredes da portaria e da cidade (caixas de correio, elevador, vidro...)
        CITY().wall(k, a1, a2, g, e, th, KIT);
      }
    });
  }
  // o telão do Ego (4 paredes de largura): ele em holograma + o próximo desafio
  function makeScreen(th, t) {
    const w = TW * 4;
    // (o dobro de pixels: o telão aparece de perto nas cenas)
    return makeTexReuse(w * 2, TH * 2, (g, e) => {
      g.scale(2, 2);
      e.scale(2, 2);
      R(g, 0, 0, w, TH, th.wall);
      R(g, 0, 5, w, 2, th.led);
      R(g, 2, 9, w - 4, 74, '#020617');
      R(g, 5, 12, w - 10, 68, '#03101c');
      const ego = th.noEgo ? null : charCd('EGO');
      if (th.noEgo) {
        // antes do Blue Lock: a transmissão do jogo (campo visto de cima, placar)
        R(g, 5, 12, w - 10, 68, '#14532d');
        for (let x = 5; x < w - 5; x += 24) R(g, x, 12, 12, 68, '#166534');
        R(g, 40, 18, w - 80, 1, '#f0fdf4');
        R(g, 40, 72, w - 80, 1, '#f0fdf4');
        R(g, 40, 18, 1, 55, '#f0fdf4');
        R(g, w - 41, 18, 1, 55, '#f0fdf4');
        R(g, w / 2, 18, 1, 55, '#f0fdf4');
        g.strokeStyle = '#f0fdf4';
        g.beginPath();
        g.arc(w / 2, 45, 9, 0, Math.PI * 2);
        g.stroke();
        R(g, w / 2 - 40, 13, 80, 9, '#020617');
        txt(g, 'FINAL REGIONAL', w / 2, 15, '#fdba74', 1);
      }
      if (ego) {
        g.save();
        g.beginPath();
        g.rect(5, 12, w - 10, 68);
        g.clip();
        g.translate(w / 2 - 70, 2);
        PR().drawCharacterSprite(g, ego, 140, 140, { facing: 'front', frame: 1, animState: 'idle', view: 'front' });
        g.restore();
        g.fillStyle = 'rgba(34,211,238,0.26)';
        g.fillRect(5, 12, w - 10, 68);
      }
      for (let y = 12 + (Math.floor(t / 5) % 3); y < 80; y += 3) R(g, 5, y, w - 10, 1, 'rgba(2,6,23,0.35)');
      const ch = window.App?.getChapter?.();
      R(g, 5, 62, w - 10, 18, 'rgba(2,6,23,0.75)');
      txt(g, 'PROXIMO DESAFIO', w / 2, 64, th.acc, 1);
      txt(g, noAcc(ch ? `CAP. ${ch.chapterNumber ?? ''} - ${String(ch.title || '').split(':')[0]}` : 'BLUE LOCK').slice(0, 58), w / 2, 71, '#f8fafc', 1);
      if (Math.floor(t / 30) % 2) R(g, w - 16, 15, 4, 4, '#ef4444');
      txt(g, 'AO VIVO', w - 34, 15, '#f8fafc', 1);
      R(g, 0, TH - 8, w, 8, sh(th.wall, -0.4));
      R(e, 5, 12, w - 10, 68, '#fff');
      R(e, 0, 5, w, 2, '#fff');
    });
  }

  // ---------------------------------------------------------------- caixas (móveis com volume)
  // { x0, y0, x1, y1, z0, z1, f: { N, S, E, W, T, B } } — cada face é uma textura
  // (u da esquerda para a direita vista de fora, v de cima para baixo)
  const D = 40; // texels por ladrilho nas caixas
  const flat = (c, w = 4, h = 4) => makeTex(w, h, (g) => R(g, 0, 0, w, h, c));
  function faceTex(lenT, hT, draw) {
    return makeTex(Math.max(2, Math.round(lenT * D)), Math.max(2, Math.round(hT * D)), draw);
  }
  // (roleta e tubo mudam a cada 2-3 quadros: reaproveitam o mesmo canvas)
  const faceTexAnim = (lenT, hT, draw) => makeTexReuse(Math.max(2, Math.round(lenT * D)), Math.max(2, Math.round(hT * D)), draw);
  // o que o js/hub3d_cidade.js usa daqui para desenhar paredes, caixas e o chão da cidade
  const KIT = { R, txt, sh, rgb, pk, noAcc, canvas, makeTex, makeTexReuse, faceTex, flat, drawPoster, charCd, PR, D, TW, TH, FTX, WALL_H, SPX };
  function buildBoxes(th, map) {
    const g = buildBoxesGen(th, map);
    let r = g.next();
    while (!r.done) r = g.next();
    return r.value;
  }
  // (em fatias: o prédio de uma cena que vem aí é montado aos poucos, ver World.prepareGen)
  function* buildBoxesGen(th, map) {
    const B = [];
    const side = (c, edge) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, c);
      R(g, 0, 0, w, 1, sh(c, 0.3));
      if (edge) R(g, 0, h - 2, w, 2, sh(c, -0.35));
    });
    // cada face do tamanho certo: as funções recebem (comprimento, altura) em ladrilhos
    const box = (x0, y0, x1, y1, z0, z1, spec, o = {}) => {
      const b = Object.assign({ x0, y0, x1, y1, z0, z1 }, o);
      const lx = x1 - x0;
      const ly = y1 - y0;
      const hz = z1 - z0;
      const f = {};
      ['N', 'S', 'E', 'W'].forEach((d) => {
        const fn = spec[d] || spec.side;
        if (fn) f[d] = typeof fn === 'function' ? fn(d === 'N' || d === 'S' ? lx : ly, hz) : fn;
      });
      if (spec.T) f.T = typeof spec.T === 'function' ? spec.T(lx, ly) : spec.T;
      if (spec.B) f.B = spec.B;
      b.f = f;
      B.push(b);
      return b;
    };
    const metal = th.metal;
    const wood = th.home ? '#6b3f26' : '#475569';
    const woodTop = th.home ? '#7c4a2d' : '#64748b';
    // vigas sobre as portas, com o nome do lugar aceso
    DOORS.forEach((d) => {
      const lab = (s) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#020617');
        R(g, 1, 1, w - 2, h - 2, sh(th.wall, -0.3));
        R(g, 0, h - 2, w, 2, th.acc);
        R(e, 0, h - 2, w, 2, '#fff');
        if (!s) return;
        txt(g, s, w / 2, Math.round(h / 2 - 3), '#f8fafc', 1);
        txt(e, s, w / 2, Math.round(h / 2 - 3), '#fff', 1);
      });
      box(d.x, d.y, d.x + 1, d.y + 1, 1.46, WALL_H, { N: lab(d.N), S: lab(d.S), E: lab(d.E), W: lab(d.W), B: flat('#0f172a') }, { solid: false });
    });
    yield;
    // ---- seu quarto
    const sheet = th.home ? (th.id === 'school' ? '#1e3a5f' : '#7f1d1d') : th.acc2;
    const bedTop = (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#e2e8f0');
      R(g, 4, 3, w - 8, 12, '#f8fafc');
      R(g, 4, 14, w - 8, 2, '#cbd5e1');
      R(g, 0, 26, w, h - 26, sheet);
      R(g, 0, 26, w, 3, sh(sheet, 0.3));
      for (let y = 34; y < h; y += 10) R(g, 0, y, w, 1, sh(sheet, -0.2));
    });
    const bedSide = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, sh(sheet, -0.25));
      R(g, 0, 0, w, 2, sheet);
      R(g, 0, h - 5, w, 5, metal);
    });
    box(9.08, 22.45, 10.12, 24.55, 0, 0.36, { side: bedSide, T: bedTop });
    box(9.08, 22.3, 10.12, 22.45, 0, 0.8, { side: side(metal, true), T: flat(sh(metal, 0.3)) });
    box(9.1, 24.7, 9.62, 25.2, 0, 0.42, { side: side(wood, true), T: flat(woodTop) });
    const deskTop = (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
      R(g, 0, 0, w, h, woodTop);
      R(g, 4, 18, 12, 26, '#1e293b');
      for (let i = 0; i < 6; i++) R(g, 6, 20 + i * 4, 8, 2, '#475569');
      R(g, 6, 50, 6, 8, '#cbd5e1');
    });
    box(15.25, 27.5, 15.98, 29.1, 0, 0.56, { side: side(wood, true), T: deskTop });
    box(15.74, 27.85, 15.84, 28.75, 0.56, 0.98, {
      side: side('#0f172a'),
      W: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#020617');
        R(g, 2, 2, w - 4, h - 4, '#0b1a33');
        [0.5, 0.8, 0.6, 0.9, 0.7].forEach((k, i) => R(g, 5 + i * 6, h - 4 - Math.round(k * (h - 10)), 4, Math.round(k * (h - 10)), i === 3 ? th.acc : '#38bdf8'));
        txt(g, 'OVR', w - 8, 4, '#f8fafc', 1);
        R(e, 2, 2, w - 4, h - 4, '#fff');
      })
    });
    yield;
    // ---- ala dos quartos
    const benchSpec = {
      side: side('#78350f', true),
      T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#92400e');
        for (let x = 0; x < w; x += 6) R(g, x, 0, 1, h, '#78350f');
      })
    };
    box(6.3, 18.06, 7.7, 18.4, 0, 0.26, benchSpec);
    box(10.3, 18.06, 11.7, 18.4, 0, 0.26, benchSpec);
    yield;
    // ---- saguão: balcão da loja, sofás, mesinha, máquinas, bancos
    const shopFront = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#f8fafc');
      R(g, 0, 0, w, 3, '#f472b6');
      for (let x = 0; x < w; x += 10) R(g, x, 5, 5, h - 5, '#fbcfe8');
      R(g, w / 2 - 22, 6, 44, 11, '#831843');
      txt(g, 'LOJA', w / 2, 9, '#fdf2f8', 1);
      txt(e, 'LOJA', w / 2, 9, '#fff', 1);
      R(e, 0, 0, w, 3, '#fff');
    });
    const shopTop = (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#e2e8f0');
      R(g, 0, 0, w, h, 'rgba(186,230,253,0.5)');
      for (let i = 0; i < 8; i++) R(g, 6 + i * 14, 6 + (i % 2) * 6, 8, 6, ['#ef4444', '#facc15', '#38bdf8', '#a855f7'][i % 4]);
    });
    box(17.3, 11.2, 20.3, 11.72, 0, 0.58, { side: shopFront, E: side('#f8fafc'), W: side('#f8fafc'), N: side('#cbd5e1'), T: shopTop });
    const sofaC = th.home ? '#57534e' : sh(th.acc2, -0.25);
    const sofaSpec = {
      side: side(sh(sofaC, -0.2), true),
      T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
        R(g, 0, 0, w, h, sofaC);
        R(g, Math.round(w / 2), 0, 1, h, sh(sofaC, -0.3));
        R(g, 0, 0, w, 2, sh(sofaC, 0.25));
      })
    };
    [[22.7, 24.7], [25.3, 27.3]].forEach(([x0, x1]) => {
      box(x0, 14.7, x1, 15.35, 0, 0.3, sofaSpec);
      box(x0, 15.35, x1, 15.62, 0, 0.64, { side: side(sh(sofaC, -0.1), true), T: flat(sh(sofaC, 0.15)) });
      box(x0 - 0.12, 14.7, x0, 15.62, 0, 0.44, { side: side(sh(sofaC, -0.15), true), T: flat(sh(sofaC, 0.2)) });
      box(x1, 14.7, x1 + 0.12, 15.62, 0, 0.44, { side: side(sh(sofaC, -0.15), true), T: flat(sh(sofaC, 0.2)) });
    });
    box(24.0, 13.2, 26.0, 13.75, 0, 0.26, {
      side: side('#1e293b', true),
      T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#334155');
        R(g, 10, 6, 14, 10, '#f8fafc');
        R(g, 12, 8, 10, 2, '#ef4444');
        R(g, 50, 8, 8, 8, '#e2e8f0');
        R(g, 52, 10, 4, 4, '#78350f');
      })
    });
    const vendFace = (c) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, c);
      R(g, 3, 5, w - 12, h - 18, '#0b1220');
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) R(g, 5 + k * 6, 8 + r * 7, 4, 5, ['#38bdf8', '#facc15', '#f472b6', '#4ade80', '#ef4444'][(r + k) % 5]);
      R(e, 3, 5, w - 12, h - 18, '#fff');
      R(g, w - 7, 8, 4, 10, '#e5e7eb');
      R(g, 5, h - 10, w - 14, 5, '#020617');
      R(g, 0, 0, w, 3, sh(c, 0.3));
    });
    const vend = (c, front) => ({ side: side(sh(c, -0.25), true), T: flat(sh(c, -0.4)), [front]: vendFace(c) });
    box(32.25, 17.9, 32.98, 18.75, 0, 1.15, vend('#1d4ed8', 'W'));
    box(32.25, 18.85, 32.98, 19.7, 0, 1.15, vend('#dc2626', 'W'));
    box(18.4, 20.55, 20.4, 20.94, 0, 0.27, benchSpec);
    box(29.4, 20.55, 31.4, 20.94, 0, 0.27, benchSpec);
    yield;
    // ---- refeitório
    const steel = '#94a3b8';
    box(4.6, 7.0, 10.8, 7.75, 0, 0.62, {
      side: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, steel);
        R(g, 0, 0, w, 3, '#e2e8f0');
        for (let x = 6; x < w; x += 20) R(g, x, 8, 14, h - 12, '#cbd5e1');
        R(g, 0, h - 3, w, 3, '#475569');
      }),
      T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#cbd5e1');
        for (let i = 0; i < 12; i++) {
          R(g, 4 + i * 20, 6, 16, 14, '#475569');
          R(g, 5 + i * 20, 7, 14, 12, ['#f59e0b', '#16a34a', '#f8fafc', '#b45309'][i % 4]);
        }
      })
    });
    box(11.4, 7.05, 12.2, 7.75, 0, 1.15, vend('#16a34a', 'S'));
    box(12.4, 7.05, 13.2, 7.75, 0, 1.15, vend('#f59e0b', 'S'));
    const tableSpec = {
      side: side('#334155', true),
      T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#e2e8f0');
        R(g, 0, 0, w, 1, '#f8fafc');
        for (let i = 0; i < 5; i++) {
          [4, h - 14].forEach((y, j) => {
            const x = 8 + i * 32 + j * 12;
            R(g, x, y, 14, 10, '#64748b');
            R(g, x + 1, y + 1, 6, 8, '#f8fafc');
            R(g, x + 7, y + 1, 6, 4, '#f59e0b');
            R(g, x + 7, y + 5, 6, 4, '#16a34a');
          });
        }
      })
    };
    [[5.4, 9.6], [10.4, 14.6]].forEach(([x0, x1]) => [[9.8, 10.55], [12.3, 13.05]].forEach(([y0, y1]) => {
      box(x0, y0, x1, y1, 0, 0.42, tableSpec);
      box(x0 + 0.1, y0 - 0.42, x1 - 0.1, y0 - 0.17, 0, 0.24, benchSpec);
      box(x0 + 0.1, y1 + 0.17, x1 - 0.1, y1 + 0.42, 0, 0.24, benchSpec);
    }));
    yield;
    // ---- ala do treino
    box(34.6, 15.55, 36.2, 15.92, 0, 0.26, benchSpec);
    box(40.6, 15.55, 42.2, 15.92, 0, 0.26, benchSpec);
    yield;
    // ---- vestiário: bancos na frente dos armários
    box(35.15, 17.06, 37.85, 17.4, 0, 0.26, benchSpec);
    box(39.15, 17.06, 42.85, 17.4, 0, 0.26, benchSpec);
    box(35.06, 20.0, 35.4, 22.4, 0, 0.26, benchSpec);
    box(42.6, 20.0, 42.94, 22.4, 0, 0.26, benchSpec);
    yield;
    // ---- academia: esteiras, rack de halteres, supino
    [36.0, 37.4, 38.8].forEach((cx) => {
      box(cx - 0.32, 6.55, cx + 0.32, 7.75, 0, 0.16, {
        side: side('#111827', true),
        T: (lx, ly) => faceTex(lx, ly, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#1f2937');
          R(g, 3, 0, w - 6, h, '#030712');
          for (let y = 0; y < h; y += 5) R(g, 3, y, w - 6, 1, '#111827');
        })
      });
      box(cx - 0.32, 6.32, cx + 0.32, 6.5, 0, 0.92, {
        side: side('#334155'),
        T: flat('#1e293b'),
        S: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#334155');
          R(g, 3, 3, w - 6, 9, '#020617');
          R(g, 5, 5, w - 10, 5, '#22c55e');
          txt(g, '12', w / 2, 5, '#022c22', 1);
          R(e, 3, 3, w - 6, 9, '#fff');
          R(g, 0, 14, w, 2, '#94a3b8');
        })
      });
    });
    box(42.25, 7.2, 42.98, 9.4, 0, 0.95, {
      side: side('#1f2937', true),
      T: flat('#111827'),
      W: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, '#111827');
        for (let r = 0; r < 3; r++) {
          R(g, 0, 8 + r * 12, w, 2, '#4b5563');
          for (let i = 0; i < 7; i++) {
            const c = ['#ef4444', '#3b82f6', '#22c55e', '#facc15'][(i + r) % 4];
            R(g, 4 + i * 12, 2 + r * 12, 3, 6, c);
            R(g, 7 + i * 12, 4 + r * 12, 3, 2, '#9ca3af');
            R(g, 10 + i * 12, 2 + r * 12, 3, 6, c);
          }
        }
      })
    });
    box(39.9, 9.4, 40.35, 10.6, 0, 0.32, { side: side('#111827', true), T: flat('#7f1d1d') });
    box(39.62, 9.48, 39.72, 9.58, 0, 0.86, { side: flat('#9ca3af') });
    box(40.53, 9.48, 40.63, 9.58, 0, 0.86, { side: flat('#9ca3af') });
    box(39.4, 9.5, 40.85, 9.56, 0.8, 0.84, { side: flat('#d1d5db'), T: flat('#e5e7eb') }, { solid: false });
    box(39.42, 9.42, 39.52, 9.64, 0.7, 0.94, { side: flat('#111827') }, { solid: false });
    box(40.73, 9.42, 40.83, 9.64, 0.7, 0.94, { side: flat('#111827') }, { solid: false });
    yield;
    // ---- campo: traves com rede, refletores, bancos
    const white = flat('#f1f5f9');
    const net = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      for (let x = 0; x < w; x += 4) R(g, x, 0, 1, h, 'rgba(241,245,249,0.95)');
      for (let y = 0; y < h; y += 4) R(g, 0, y, w, 1, 'rgba(241,245,249,0.95)');
    });
    [[6.55, 6.67, 6.02, 6.06], [22.33, 22.45, 22.94, 22.98]].forEach(([p0, p1, n0, n1]) => {
      box(51.9, p0, 52.02, p1, 0, 1.0, { side: white, T: white });
      box(53.98, p0, 54.1, p1, 0, 1.0, { side: white, T: white });
      box(51.9, p0, 54.1, p1, 0.98, 1.08, { side: white, T: white, B: flat('#cbd5e1') }, { solid: false });
      box(51.9, n0, 54.1, n1, 0, 1.06, { side: net });
      const s0 = Math.min(p0, n0);
      const s1 = Math.max(p1, n1);
      box(51.9, s0, 51.94, s1, 0, 1.0, { side: net });
      box(54.06, s0, 54.1, s1, 0, 1.0, { side: net });
    });
    const lampHead = (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#1f2937');
      const cw = Math.floor((w - 4) / 4);
      for (let i = 0; i < 4; i++) {
        R(g, 2 + i * cw, 3, cw - 2, h - 6, '#fefce8');
        R(e, 2 + i * cw, 3, cw - 2, h - 6, '#fff');
      }
    });
    [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]].forEach(([x, y]) => {
      box(x - 0.1, y - 0.1, x + 0.1, y + 0.1, 0, 3.3, { side: side('#64748b') });
      box(x - 0.45, y - 0.2, x + 0.45, y + 0.2, 3.1, 3.55, { side: lampHead, T: flat('#111827'), B: lampHead(0.9, 0.4) }, { solid: false });
    });
    box(45.08, 9.0, 45.5, 11.4, 0, 0.3, benchSpec);
    box(45.08, 17.6, 45.5, 20.0, 0, 0.3, benchSpec);
    yield;
    // ---- sala das armas: roleta (o disco gira), tubo do Fluxo, pedestais
    const dm = '#1e1b2e';
    box(23.6, 28.7, 25.4, 29.5, 0, 0.32, {
      side: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
        R(g, 0, 0, w, h, dm);
        R(g, 0, 0, w, 2, '#facc15');
        R(e, 0, 0, w, 2, '#fff');
      }),
      T: flat('#2e2a45')
    });
    World.wheel = box(23.7, 29.0, 25.3, 29.1, 0.32, 1.45, { side: flat('#0f0d1a') });
    box(29.85, 28.45, 30.95, 29.55, 0, 0.14, { side: side(dm, true), T: flat('#2e2a45') });
    World.tube = box(30.0, 28.6, 30.8, 29.4, 0.14, 1.36, { side: flat('#4c1d95') });
    box(29.85, 28.45, 30.95, 29.55, 1.36, WALL_H, { side: side(dm), B: flat('#a855f7') }, { solid: false });
    [[23.5, 32.2, '#ef4444'], [26.2, 32.4, '#38bdf8'], [28.8, 32.4, '#22c55e'], [31.5, 32.2, '#facc15']].forEach(([x, y, c]) => {
      box(x - 0.22, y - 0.22, x + 0.22, y + 0.22, 0, 0.55, {
        side: (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
          R(g, 0, 0, w, h, '#1e293b');
          R(g, 0, 0, w, 2, c);
          R(e, 0, 0, w, 2, '#fff');
          R(g, 3, 6, w - 6, h - 9, '#0f172a');
        }),
        T: flat(c)
      });
    });
    // viga grande na entrada da sala das armas
    const bigLab = (s, c) => (lenT, hT) => faceTex(lenT, hT, (g, e, w, h) => {
      R(g, 0, 0, w, h, '#0b0a14');
      R(g, 0, h - 2, w, 2, '#a855f7');
      txt(g, s, w / 2, Math.round(h / 2 - 3), c, 1);
      txt(e, s, w / 2, Math.round(h / 2 - 3), '#fff', 1);
      R(e, 0, h - 2, w, 2, '#fff');
    });
    box(26, 25.7, 29, 26, 1.46, WALL_H, { N: bigLab('SALA DAS ARMAS', '#facc15'), S: bigLab('SAIDA', '#e2e8f0'), side: flat('#0b0a14'), B: flat('#0f0d1a') }, { solid: false });
    // ---- a cidade (só no tema pro): portaria, fachadas, carros, banca, telão, quadra...
    if (map && map.city && CITY()) {
      yield;
      yield* CITY().boxes(th, Object.assign({ box, side }, KIT));
    }
    B.forEach((b, i) => {
      b.id = i;
      b.iw = 1 / (b.x1 - b.x0);
      b.id2 = 1 / (b.y1 - b.y0);
      if (b.solid === undefined) b.solid = b.z0 < 0.9 && b.z1 > 0.08;
    });
    return B;
  }
  // disco da roleta e tubo do Fluxo: refeitos enquanto você está na sala
  function wheelTex(t) {
    return faceTexAnim(1.6, 1.13, (g, e, w, h) => {
      const cx = w / 2;
      const cy = h / 2 + 2;
      const r = Math.min(w, h) / 2 - 4;
      R(g, 0, 0, w, h, '#0f0d1a');
      const cols = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#f97316'];
      const a0 = t * 0.03;
      for (let k = 0; k < 6; k++) {
        g.fillStyle = cols[k];
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, r, a0 + (k * Math.PI) / 3, a0 + ((k + 1) * Math.PI) / 3);
        g.fill();
      }
      e.fillStyle = '#fff';
      e.beginPath();
      e.arc(cx, cy, r + 2, 0, Math.PI * 2);
      e.fill();
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
      R(g, cx - 3, cy - 3, 6, 6, '#f8fafc');
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.moveTo(cx - 4, 1);
      g.lineTo(cx + 4, 1);
      g.lineTo(cx, 8);
      g.fill();
    });
  }
  function tubeTex(t) {
    return faceTexAnim(0.8, 1.22, (g, e, w, h) => {
      const c = '#a855f7';
      R(g, 0, 0, w, h, sh(c, -0.45));
      R(g, 4, 0, w - 8, h, sh(c, -0.15));
      R(g, w / 2 - 3, 0, 6, h, sh(c, 0.3));
      for (let i = 0; i < 10; i++) {
        const y = h - ((t * 0.6 + i * 11) % h);
        R(g, 4 + ((i * 7) % (w - 8)), y, 2, 2, '#f5f3ff');
      }
      R(g, 2, 0, 2, h, 'rgba(255,255,255,0.4)');
      R(e, 0, 0, w, h, '#fff');
    });
  }

  // ---------------------------------------------------------------- enfeites em pé (arte 2D)
  const PROPCACHE = new Map();
  // prédios já montados em outros temas (World.prepare) e o que é guardado de cada um
  const WCACHE = new Map();
  const WSNAP = ['th', 'map', 'walls', 'boxes', 'bcell', 'bseen', 'sprites', 'screenTex', 'wheel', 'tube', 'lights', 'L', 'AO', 'FL', 'FA', 'CA', 'FE', 'CL', 'CE', 'sky', 'fog'];
  // (com ou sem a cidade: o mesmo tema pode vir dos dois jeitos, ex.: Blue Lock antes e
  // depois da liga profissional)
  const keyOf = (th) => `${th.id}|${th.acc}|${th.acc2}|${th.name}|${cityOf(th) ? 'c' : ''}`;
  // quanto o chão de cada área reflete (piso encerado, metal, madeira... e o asfalto da rua,
  // como se tivesse chovido: os postes e as vitrines brilham no chão)
  function reflOf(th) {
    const R0 = { quarto: th.home ? 0.12 : 0.05, dorm: 0.28, saguao: 0.34, refeitorio: 0.26, treino: 0.28, academia: 0.16, campo: 0.07, subsolo: 0.18, armas: 0.36, vestiario: 0.3, portaria: 0.3, rua: 0.14, praca: 0.06, avenida: 0.14, comercio: 0.07, torres: 0.14, parque: 0.03 };
    return Float32Array.from(AREA_IDS.map((id) => R0[id] || 0));
  }
  // as texturas de parede que o prédio usa (as mesmas que o 3D pede ao montar: js/hub3d_gl.js)
  function wallKeys(m) {
    const out = new Map();
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const sv = m.solid[y * MW + x];
      if (!sv) continue;
      const fc = m.face[y * MW + x] || {};
      [['N', 0, -1], ['S', 0, 1], ['W', -1, 0], ['E', 1, 0]].forEach(([dir, dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || m.solid[ny * MW + nx]) return;
        const ai = m.area[ny * MW + nx];
        const style = AREAS[AREA_IDS[ai >= 0 ? ai : 2]].wall;
        const sp = fc[dir];
        if (sp && sp.startsWith('screen:')) return;
        const kind = sp || (sv === 2 ? 'pillar' : 'base');
        out.set(kind + '|' + style, [kind, style]);
      });
    }
    return [...out.values()];
  }
  function propTex(key, factory, th) {
    const k = `${key}|${th.id}|${th.acc}`;
    if (PROPCACHE.has(k)) return PROPCACHE.get(k);
    const p = factory();
    const pad = 24;
    const top = 110;
    const cv = canvas(p.w + pad * 2, Math.ceil(top + p.d * Hub.FY + pad));
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    const S = { sx: (x) => Math.round(x - p.x + pad), sy: (y) => Math.round((y - p.y) * Hub.FY) + top, W: cv.width, H: cv.height };
    p.draw(g, S, th);
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    // tira a sombra 2D (semitransparente) e recorta no desenho
    let x0 = cv.width;
    let y0 = cv.height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (d[i + 3] < 180) {
        d[i + 3] = 0;
        continue;
      }
      d[i + 3] = 255;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const px = new Uint32Array(w * h);
    const src = new Uint32Array(d.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = src[(y + y0) * cv.width + x + x0];
    const tex = { w, h, px, em: null };
    PROPCACHE.set(k, tex);
    return tex;
  }
  function crystalTex(c) {
    return makeTex(12, 20, (g, e) => {
      for (let i = 0; i < 20; i++) {
        const hw = Math.round(6 * (1 - Math.abs(i - 9) / 10));
        R(g, 6 - hw, i, hw * 2, 1, i < 9 ? sh(c, 0.3) : sh(c, -0.1));
        R(e, 6 - hw, i, hw * 2, 1, '#fff');
      }
      R(g, 5, 3, 1, 5, '#f8fafc');
    });
  }
  function buildSprites(th, map) {
    const P = Hub.P;
    const L = [];
    const add = (key, factory, x, y, o = {}) => L.push(Object.assign({ key, factory, x, y, r: 0.22, k: 1, shadow: 0.25 }, o));
    const city = !!(map && map.city && CITY());
    add('plant', () => P.plant(0, 0), 15.5, 22.5);
    add('lamp', () => P.lamp(0, 0), 9.36, 24.95, { z: 0.42, k: 0.55, r: 0, shadow: 0, glow: true });
    add('chair', () => P.chair(0, 0), 14.9, 28.3, { r: 0.2 });
    add('ball', () => P.ball(0, 0), 12.2, 29.3, { r: 0, shadow: 0.12 });
    add('bag', () => P.bag(0, 0, th.acc2), 10.55, 22.7, { r: 0, shadow: 0.15 });
    // (no apartamento a porta da rua fica na parede de baixo: o tênis vai para o lado dela)
    add('shoes', () => P.shoes(0, 0), city ? 14.45 : 13.6, 29.6, { r: 0, shadow: 0 });
    add('plant', () => P.plant(0, 0), 2.45, 18.45);
    add('plant', () => P.plant(0, 0), 2.45, 20.55);
    add('cooler', () => P.cooler(0, 0), 14.7, 18.35, { r: 0.25 });
    add('gacha', () => P.gacha(0, 0), 20.75, 9.5, { r: 0.28 });
    add('gacha', () => P.gacha(0, 0), 21.55, 9.5, { r: 0.28 });
    add('plant', () => P.plant(0, 0), 32.5, 9.5);
    add('plant', () => P.plant(0, 0), 17.5, 20.5);
    add('plant', () => P.plant(0, 0), 32.5, 20.5);
    add('plant', () => P.plant(0, 0), 22.6, 9.5);
    add('plant', () => P.plant(0, 0), 27.4, 9.5);
    add('cooler', () => P.cooler(0, 0), 14.6, 7.4, { r: 0.25 });
    add('plant', () => P.plant(0, 0), 4.5, 14.5);
    add('bin', () => P.bin(0, 0), 15.5, 14.5, { r: 0.18 });
    add('cooler', () => P.cooler(0, 0), 43.5, 13.4, { r: 0.25 });
    add('plant', () => P.plant(0, 0), 34.5, 13.5);
    add('ball', () => P.ball(0, 0), 41.6, 11.3, { r: 0, shadow: 0.12 });
    add('bag', () => P.bag(0, 0, th.acc2), 36.1, 17.62, { r: 0, shadow: 0.15 });
    add('bag', () => P.bag(0, 0, th.acc2), 41.7, 17.62, { r: 0, shadow: 0.15 });
    add('ball', () => P.ball(0, 0), 42.4, 19.4, { r: 0, shadow: 0.12 });
    add('cooler', () => P.cooler(0, 0), 35.4, 22.5, { r: 0.25 });
    [[48.5, 10.5], [49.5, 11.5], [48.5, 12.5], [49.5, 13.5], [56.5, 16], [57.5, 17], [56.5, 18]].forEach(([x, y]) => add('cone', () => P.cone(0, 0), x, y, { r: 0, shadow: 0.1 }));
    [[53, 14.5], [50.2, 9.4], [55.8, 19.6], [52.6, 7.4]].forEach(([x, y]) => add('ball', () => P.ball(0, 0), x, y, { r: 0, shadow: 0.12 }));
    [[23.5, 32.2, '#ef4444'], [26.2, 32.4, '#38bdf8'], [28.8, 32.4, '#22c55e'], [31.5, 32.2, '#facc15']].forEach(([x, y, c], i) => L.push({ key: 'crystal' + i, tex: crystalTex(c), x, y, z: 0.66, r: 0, k: 1, shadow: 0, glow: true, bob: i }));
    // árvores, lixeiras, vasos e a placa da banca da cidade
    if (city) CITY().sprites(th, add, L, KIT);
    return L;
  }

  // ---------------------------------------------------------------- chão, teto e luz
  function floorTexes(th) {
    const T = {};
    const mk = (k, w, h, draw) => (T[k] = makeTex(w, h, draw));
    mk('tile', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, th.floorA);
      R(g, 16, 0, 16, 16, th.floorB);
      R(g, 0, 16, 16, 16, th.floorB);
      R(g, 0, 0, 32, 1, th.floorLine);
      R(g, 0, 0, 1, 32, th.floorLine);
      R(g, 0, 16, 32, 1, th.floorLine);
      R(g, 16, 0, 1, 32, th.floorLine);
      R(g, 5, 7, 4, 1, sh(th.floorA, 0.15));
      R(g, 22, 25, 4, 1, sh(th.floorB, 0.15));
    });
    mk('tileBig', 64, 64, (g) => {
      const a = sh(th.floorA, 0.06);
      R(g, 0, 0, 64, 64, a);
      R(g, 32, 0, 32, 32, th.floorB);
      R(g, 0, 32, 32, 32, th.floorB);
      R(g, 0, 0, 64, 1, th.floorLine);
      R(g, 0, 0, 1, 64, th.floorLine);
      R(g, 0, 32, 64, 1, th.floorLine);
      R(g, 32, 0, 1, 64, th.floorLine);
      R(g, 6, 9, 10, 1, sh(a, 0.2));
      R(g, 40, 44, 10, 1, sh(th.floorB, 0.2));
    });
    mk('tileL', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, '#cbd5e1');
      for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) R(g, x, y, 7, 7, (x + y) % 16 ? '#d6dee8' : '#bcc7d6');
    });
    mk('carpet', 32, 32, (g) => {
      if (th.home) {
        R(g, 0, 0, 32, 32, '#7c4a2d');
        for (let y = 0; y < 32; y += 8) R(g, 0, y, 32, 1, '#4a2a18');
        R(g, 12, 0, 1, 8, '#4a2a18');
        R(g, 26, 8, 1, 8, '#4a2a18');
        R(g, 6, 16, 1, 8, '#4a2a18');
        R(g, 20, 24, 1, 8, '#4a2a18');
      } else {
        const c = sh(th.acc2, -0.62);
        R(g, 0, 0, 32, 32, c);
        for (let i = 0; i < 40; i++) R(g, (i * 13) % 32, (i * 7) % 32, 1, 1, sh(c, i % 2 ? 0.2 : -0.2));
      }
    });
    mk('mat', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, '#1f2937');
      for (let i = 0; i < 40; i++) R(g, (i * 11) % 32, (i * 17) % 32, 1, 1, i % 3 ? '#374151' : '#111827');
      R(g, 0, 0, 32, 1, '#111827');
      R(g, 0, 0, 1, 32, '#111827');
    });
    mk('turf', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, '#15803d');
      for (let i = 0; i < 50; i++) R(g, (i * 13) % 32, (i * 7) % 32, 1, 2, i % 2 ? '#16a34a' : '#166534');
    });
    mk('metal', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, '#232030');
      for (let y = 0; y < 32; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 32; x += 8) R(g, x, y + 2, 3, 1, '#3a3550');
      R(g, 0, 0, 32, 1, '#14121c');
      R(g, 0, 0, 1, 32, '#14121c');
    });
    mk('stairs', 32, 32, (g) => {
      R(g, 0, 0, 32, 32, '#52525b');
      R(g, 0, 0, 32, 3, '#facc15');
      R(g, 0, 3, 32, 2, '#27272a');
      R(g, 0, 16, 32, 3, '#facc15');
      R(g, 0, 19, 32, 2, '#27272a');
      for (let i = 0; i < 12; i++) R(g, (i * 11) % 32, 6 + ((i * 5) % 9), 2, 1, '#3f3f46');
    });
    return T;
  }
  function ceilTexes(th) {
    const base = th.ceil || '#0b1324';
    return {
      ceil: makeTex(16, 16, (g) => {
        R(g, 0, 0, 16, 16, base);
        R(g, 0, 0, 16, 1, sh(base, -0.5));
        R(g, 0, 0, 1, 16, sh(base, -0.5));
        R(g, 1, 1, 15, 1, sh(base, 0.12));
      }),
      lamp: makeTex(16, 16, (g, e) => {
        R(g, 0, 0, 16, 16, base);
        R(g, 3, 3, 10, 10, '#94a3b8');
        R(g, 4, 4, 8, 8, `rgb(${th.lamp.join(',')})`);
        R(g, 5, 5, 6, 6, '#f8fafc');
        R(e, 4, 4, 8, 8, '#fff');
      }),
      dark: makeTex(16, 16, (g) => {
        R(g, 0, 0, 16, 16, '#0b0a14');
        R(g, 0, 0, 16, 1, '#05040a');
      }),
      strip: makeTex(16, 16, (g, e) => {
        R(g, 0, 0, 16, 16, '#0b0a14');
        R(g, 0, 7, 16, 2, '#c084fc');
        R(e, 0, 7, 16, 2, '#fff');
      }),
      tube: makeTex(16, 16, (g, e) => {
        R(g, 0, 0, 16, 16, '#111827');
        R(g, 2, 6, 12, 4, '#e0f2fe');
        R(e, 2, 6, 12, 4, '#fff');
      })
    };
  }
  const col01 = (c) => rgb(c).map((v) => v / 255);

  const World = {
    key: '',
    th: null,
    map: null,
    boxes: [],
    bcell: null,
    sprites: [],
    walls: {},
    prepare(th) {
      const key = keyOf(th);
      if (this.key === key && this.map) return false;
      // Montar o prédio (luz, chão, paredes) leva ~1 s no PC e vários no celular. As cenas
      // de cinema com cenário de outra fase trocavam o tema e montavam tudo de novo na
      // entrada e outra vez na volta (o jogo travava no fim da cena): o prédio montado
      // fica guardado (os 2 últimos) e a volta é na hora.
      const ck = (k) => `${k}|${this.gl ? 1 : 0}`;
      // (pega o guardado antes de guardar o atual: guardar pode tirar o mais velho)
      const old = this.map ? WCACHE.get(ck(key)) : null;
      if (old) WCACHE.delete(ck(key));
      if (this.key && this.th) {
        const snap = { refl: Float32Array.from(REFL), props: new Map(PROPCACHE) };
        WSNAP.forEach((f) => (snap[f] = this[f]));
        // (no 3D o chão aceso do modo simples não é usado)
        if (this.gl) ['FL', 'FE', 'CL', 'CE'].forEach((f) => (snap[f] = null));
        WCACHE.delete(ck(this.key));
        WCACHE.set(ck(this.key), snap);
        while (WCACHE.size > 2) WCACHE.delete(WCACHE.keys().next().value);
      }
      this.key = key;
      this.miniKey = null;
      if (old) {
        WSNAP.forEach((f) => (this[f] = old[f]));
        REFL.set(old.refl);
        PROPCACHE.clear();
        old.props.forEach((v, k) => PROPCACHE.set(k, v));
        return true;
      }
      PROPCACHE.clear();
      const g = this.fillGen(this, th);
      while (!g.next().done);
      REFL.set(reflOf(th));
      return true;
    },
    // monta o prédio do tema th em T (o próprio World, ou um rascunho que herda dele), com
    // pausas (yield) para dar para montar aos poucos (prewarmGen)
    *fillGen(T, th) {
      T.th = th;
      // a planta deste tema (com a cidade só no tema pro)
      T.map = mapFor(th);
      T.walls = {};
      const w0 = World.wheel;
      const t0 = World.tube;
      T.boxes = yield* buildBoxesGen(th, T.map);
      // (as caixas marcam a roleta e o tubo no World: ficam no prédio que está sendo montado)
      T.wheel = World.wheel;
      T.tube = World.tube;
      if (T !== World) {
        World.wheel = w0;
        World.tube = t0;
      }
      T.bcell = new Array(MW * MH).fill(null);
      T.boxes.forEach((b) => {
        for (let y = Math.floor(b.y0); y <= Math.floor(b.y1 - 1e-6); y++) for (let x = Math.floor(b.x0); x <= Math.floor(b.x1 - 1e-6); x++) {
          const i = y * MW + x;
          (T.bcell[i] = T.bcell[i] || []).push(b.id);
        }
      });
      T.bseen = new Int32Array(T.boxes.length);
      T.sprites = buildSprites(th, T.map);
      T.screenTex = makeScreen(th, 0);
      T.wheel.f.S = T.wheel.f.N = wheelTex(0);
      const tt = tubeTex(0);
      ['N', 'S', 'E', 'W'].forEach((d) => (T.tube.f[d] = tt));
      yield;
      yield* T.buildLightGen(th);
      yield* T.bakeGen(th);
      T.sky = T.makeSky(th);
      T.fog = th.fog || [4, 8, 20];
    },
    // Adianta o prédio de um tema (o de uma cena de cinema que vem aí) sem mexer no atual:
    // um rascunho montado em fatias (o chamador roda um pouco por quadro) e guardado como os
    // outros prédios, junto com as texturas das paredes. A cena entra sem esperar.
    *prewarmGen(th) {
      if (!this.map || this.ready(th)) return;
      const gl = !!this.gl;
      const T = Object.create(World);
      T.gl = gl;
      yield* this.fillGen(T, th);
      // os enfeites em pé (bolas, cones, placas...) já desenhados
      for (let i = 0; i < T.sprites.length; i++) {
        const s = T.sprites[i];
        if (!s.tex) s.tex = propTex(s.key, s.factory, th);
        if (i % 4 === 3) yield;
      }
      const keys = wallKeys(T.map);
      for (let i = 0; i < keys.length; i++) {
        T.wallTex(keys[i][0], keys[i][1]);
        if (i % 3 === 2) yield;
      }
      if (!!this.gl !== gl || this.ready(th)) return;
      const snap = { refl: reflOf(th), props: new Map() };
      WSNAP.forEach((f) => (snap[f] = T[f]));
      if (gl) ['FL', 'FE', 'CL', 'CE'].forEach((f) => (snap[f] = null));
      WCACHE.set(`${keyOf(th)}|${gl ? 1 : 0}`, snap);
      while (WCACHE.size > 2) WCACHE.delete(WCACHE.keys().next().value);
    },
    // o prédio deste tema já está montado (ou guardado)? (a cena de cinema mostra um quadro
    // preto antes de montar um cenário novo, em vez de congelar a tela anterior)
    ready(th) {
      const key = keyOf(th);
      return (this.key === key && !!this.map) || WCACHE.has(`${key}|${this.gl ? 1 : 0}`);
    },
    // o prédio guardado de um tema (para o 3D adiantar as texturas dele: js/hub3d_gl.js)
    snapOf(th) {
      return WCACHE.get(`${keyOf(th)}|${this.gl ? 1 : 0}`) || null;
    },
    wallTex(kind, style) {
      const key = `${kind}|${style}`;
      let t = this.walls[key];
      if (!t) t = this.walls[key] = makeWallTex(kind, this.th, style);
      return t;
    },
    isSolid(x, y) {
      if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
      return this.map.solid[y * MW + x] !== 0;
    },
    areaAt(x, y) {
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return null;
      const a = this.map.area[cy * MW + cx];
      return a >= 0 ? AREA_IDS[a] : null;
    },
    // luz: ambiente + luminárias do teto + luzes coloridas, só na mesma área
    // (L = luz; AO = escurecido nos cantos e perto dos móveis)
    buildLight(th) {
      const g = this.buildLightGen(th);
      while (!g.next().done);
    },
    *buildLightGen(th) {
      const m = this.map;
      const LW = MW * LM;
      const LH = m.rows * LM; // (só as linhas montadas: sem a cidade, até a 34)
      const L = new Float32Array(LW * LH * 3);
      const AO = new Float32Array(LW * LH).fill(1);
      const amb = th.amb.map((v) => (v / 255) * 0.95);
      const lamp = th.lamp.map((v) => v / 255);
      const lights = [];
      // luz ambiente de cada área: o campo é um pouco mais claro; a rua à noite fica mais
      // azulada (céu de fim de tarde) e mais escura que dentro de casa
      const AMB = AREA_IDS.map((id, a) => (id === 'campo' ? [amb[0] + 0.1, amb[1] + 0.12, amb[2] + 0.1] : OPEN[a] && CITY() ? CITY().ambient(amb) : amb));
      for (let y = 0; y < m.rows; y++) for (let x = 0; x < MW; x++) {
        const a = m.area[y * MW + x];
        if (a < 0 || m.solid[y * MW + x]) continue;
        const id = AREA_IDS[a];
        if (OPEN[a]) continue; // (a céu aberto não tem luminária no teto)
        if (x % 3 === 1 && y % 3 === 1) lights.push({ x: x + 0.5, y: y + 0.5, r: 3.8, c: lamp, k: id === 'armas' ? 0.35 : 0.85, a, top: true });
      }
      // (o: z = altura da luz para o brilho no chão; also = acende também a área vizinha)
      const add = (x, y, r, c, k, id, o) => lights.push(Object.assign({ x, y, r, c: col01(c), k, a: AREA_IDS.indexOf(id) }, o, { a2: o && o.also ? AREA_IDS.indexOf(o.also) : -1 }));
      [[48, 9], [58, 9], [48, 20], [58, 20], [53, 14.5]].forEach(([x, y], i) => add(x, y, i === 4 ? 7 : 9.5, '#fffbeb', i === 4 ? 0.35 : 0.85, 'campo'));
      add(25, 9.8, 5.5, th.acc, 0.75, 'saguao');
      add(20.6, 9.6, 3, '#f472b6', 0.55, 'saguao');
      add(32.2, 18.4, 2.4, '#3b82f6', 0.6, 'saguao');
      add(32.2, 19.3, 2.4, '#ef4444', 0.5, 'saguao');
      add(18.8, 10.6, 2.5, '#fde68a', 0.4, 'saguao');
      add(12.3, 8.0, 2.4, '#4ade80', 0.45, 'refeitorio');
      add(7.5, 7.4, 3.5, '#fbbf24', 0.4, 'refeitorio');
      add(4.0, 10.5, 2.6, '#4ade80', 0.45, 'refeitorio');
      add(24.5, 29.2, 4.2, '#facc15', 0.95, 'armas');
      add(30.4, 29.0, 4.2, '#a855f7', 1.05, 'armas');
      [[23.5, 32.2, '#ef4444'], [26.2, 32.4, '#38bdf8'], [28.8, 32.4, '#22c55e'], [31.5, 32.2, '#facc15']].forEach(([x, y, c]) => add(x, y, 1.6, c, 0.6, 'armas'));
      add(37.4, 6.6, 3.2, '#22c55e', 0.3, 'academia');
      add(9.36, 24.95, 2.4, '#fde68a', 0.55, 'quarto');
      add(15.6, 28.3, 2, '#38bdf8', 0.4, 'quarto');
      add(39, 15.6, 3.5, th.home || th.id === 'worldcup' ? '#fbbf24' : '#93c5fd', 0.3, 'treino');
      // postes, vitrines, telão e refletores da quadra (só com a cidade)
      if (m.city && CITY()) CITY().lights(th, add);
      this.lights = lights;
      // (as luzes de cada área juntas: cada ponto só olha as da área dele, na mesma ordem)
      const byArea = [];
      lights.forEach((l) => {
        (byArea[l.a] = byArea[l.a] || []).push(l);
        if (l.a2 >= 0) (byArea[l.a2] = byArea[l.a2] || []).push(l);
      });
      const none = [];
      // (na cidade as ruas, a praça e o parque são um lugar só a céu aberto: a luz de um poste
      // chega também na calçada da rua do lado, sem emenda no chão)
      const CO = m.city ? Uint8Array.from(AREA_IDS, (id) => (CITY_OUT.includes(id) ? 1 : 0)) : null;
      const cityL = CO ? lights.filter((l) => CO[l.a] || (l.a2 >= 0 && CO[l.a2])) : null;
      // (e, de cada ladrilho, só as que chegam nele: a rua tem dezenas de luzes e cada ponto
      // olhava todas. Mesma ordem e mesma conta: o resultado é igual, só mais rápido)
      const cellL = new Array(MW * m.rows);
      // (ladrilho sem parede nem móvel em volta: o canto não escurece nada, AO = 1 direto)
      const nearAO = new Uint8Array(MW * m.rows);
      for (let cy = 0; cy < m.rows; cy++) for (let cx = 0; cx < MW; cx++) {
        const a = m.area[cy * MW + cx];
        if (a < 0) continue;
        let nb = 0;
        for (let yy = cy - 1; yy <= cy + 1 && !nb; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
          if (this.isSolid(xx, yy)) nb = 1;
          else {
            const list = this.bcell[yy * MW + xx];
            if (list && list.some((id) => this.boxes[id].z0 < 0.05 && this.boxes[id].z1 > 0.15)) nb = 1;
          }
          if (nb) break;
        }
        nearAO[cy * MW + cx] = nb;
        cellL[cy * MW + cx] = (CO && CO[a] ? cityL : byArea[a] || none).filter((l) => {
          const dx = Math.max(cx - l.x, 0, l.x - (cx + 1));
          const dy = Math.max(cy - l.y, 0, l.y - (cy + 1));
          return dx * dx + dy * dy < l.r * l.r;
        });
      }
      for (let ly = 0; ly < LH; ly++) for (let lx = 0; lx < LW; lx++) {
        if (lx === 0 && (ly & 7) === 0) yield; // (em fatias: ver prepareGen)
        const wx = (lx + 0.5) / LM;
        const wy = (ly + 0.5) / LM;
        const cx = Math.floor(wx);
        const cy = Math.floor(wy);
        const a = m.area[cy * MW + cx];
        if (a < 0) continue;
        const i = ly * LW + lx;
        const am = AMB[a];
        let r = am[0];
        let g = am[1];
        let b = am[2];
        const la = cellL[cy * MW + cx];
        for (let k = 0; k < la.length; k++) {
          const l = la[k];
          const dx = wx - l.x;
          const dy = wy - l.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= l.r * l.r) continue;
          const f = l.k * (1 - Math.sqrt(d2) / l.r) ** 2;
          r += l.c[0] * f;
          g += l.c[1] * f;
          b += l.c[2] * f;
        }
        L[i * 3] = r;
        L[i * 3 + 1] = g;
        L[i * 3 + 2] = b;
        if (!nearAO[cy * MW + cx]) continue; // (AO já é 1)
        // cantos: distância até a parede/móvel mais perto
        let dmin = 1;
        for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
          if (this.isSolid(xx, yy)) {
            const ddx = Math.max(xx - wx, 0, wx - (xx + 1));
            const ddy = Math.max(yy - wy, 0, wy - (yy + 1));
            dmin = Math.min(dmin, Math.sqrt(ddx * ddx + ddy * ddy));
          }
          const list = xx >= 0 && yy >= 0 && xx < MW && yy < MH ? this.bcell[yy * MW + xx] : null;
          if (!list) continue;
          for (let j = 0; j < list.length; j++) {
            const bb = this.boxes[list[j]];
            if (!(bb.z0 < 0.05 && bb.z1 > 0.15)) continue;
            const ddx = Math.max(bb.x0 - wx, 0, wx - bb.x1);
            const ddy = Math.max(bb.y0 - wy, 0, wy - bb.y1);
            dmin = Math.min(dmin, Math.sqrt(ddx * ddx + ddy * ddy) * 1.3);
          }
        }
        const t = Math.min(1, dmin / 0.55);
        AO[i] = 0.5 + 0.5 * t * t * (3 - 2 * t);
      }
      this.L = L;
      this.AO = AO;
    },
    // luz no ponto (interpolada) → out[0..2]
    light(x, y, out, ao) {
      const LW = MW * LM;
      const fx = x * LM - 0.5;
      const fy = y * LM - 0.5;
      let ix = Math.floor(fx);
      let iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      if (ix < 0) ix = 0;
      else if (ix > LW - 2) ix = LW - 2;
      const LH = this.map.rows * LM;
      if (iy < 0) iy = 0;
      else if (iy > LH - 2) iy = LH - 2;
      const L = this.L;
      const i00 = iy * LW + ix;
      const i10 = i00 + 1;
      const i01 = i00 + LW;
      const i11 = i01 + 1;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;
      let a = 1;
      if (ao) {
        const A = this.AO;
        a = A[i00] * w00 + A[i10] * w10 + A[i01] * w01 + A[i11] * w11;
      }
      out[0] = (L[i00 * 3] * w00 + L[i10 * 3] * w10 + L[i01 * 3] * w01 + L[i11 * 3] * w11) * a;
      out[1] = (L[i00 * 3 + 1] * w00 + L[i10 * 3 + 1] * w10 + L[i01 * 3 + 1] * w01 + L[i11 * 3 + 1] * w11) * a;
      out[2] = (L[i00 * 3 + 2] * w00 + L[i10 * 3 + 2] * w10 + L[i01 * 3 + 2] * w01 + L[i11 * 3 + 2] * w11) * a;
      return out;
    },
    // chão e teto já acesos (assados uma vez por tema)
    bake(th) {
      const g = this.bakeGen(th);
      while (!g.next().done);
    },
    *bakeGen(th) {
      const FT = floorTexes(th);
      const CT = ceilTexes(th);
      const m = this.map;
      const RW = m.rows; // (só as linhas montadas: sem a cidade, até a 34)
      const lit = !this.gl;
      // (o chão e o teto já acesos só servem no modo simples: no 3D nem são criados)
      const FW = MW * FTX;
      const FL = lit ? new Uint32Array(FW * RW * FTX) : null;
      const FE = lit ? new Uint8Array(FW * RW * FTX) : null;
      const CW = MW * CTX;
      const CL = lit ? new Uint32Array(CW * RW * CTX) : null;
      const CE = lit ? new Uint8Array(CW * RW * CTX) : null;
      // (para o motor WebGL: as cores sem luz; alfa 170 = aceso)
      const FA = new Uint32Array(FW * RW * FTX);
      const CA = new Uint32Array(CW * RW * CTX);
      const out = [0, 0, 0];
      const acc = rgb(th.acc);
      const acc2 = rgb(th.acc2);
      const rug = th.home ? (th.id === 'school' ? [30, 58, 95] : [127, 29, 29]) : acc2;
      // chão da cidade (asfalto, calçadas, faixas, grama, lago, quadra): pintado de uma vez em
      // retângulos e formas com ladrilhos prontos (js/hub3d_cidade.js), bem mais rápido que uma
      // conta por texel. paint[a] = 1 nas áreas que ele pinta.
      const paint = m.city && CITY() ? yield* CITY().paintFloor(th, FA, FW, m, KIT) : null;
      for (let cy = 0; cy < RW; cy++) for (let cx = 0; cx < MW; cx++) {
        if ((cx & 15) === 0) yield; // (em fatias: ver prepareGen)
        const ai = m.area[cy * MW + cx];
        if (ai < 0 || m.solid[cy * MW + cx]) continue;
        const id = AREA_IDS[ai];
        const tex = FT[AREAS[id].floor];
        if (paint && paint[ai]) {
          // já pintado: no desenho simples ainda acende com a luz assada (no 3D nem precisa)
          // (a luz é lida a cada 2 x 2 texels: o mapa de luz tem 1 amostra a cada 4)
          if (lit) {
            for (let v = 0; v < FTX; v += 2) for (let u = 0; u < FTX; u += 2) {
              this.light(cx + (u + 1) / FTX, cy + (v + 1) / FTX, out, true);
              for (let k = 0; k < 4; k++) {
                const fi = (cy * FTX + v + (k >> 1)) * FW + cx * FTX + u + (k & 1);
                const c = FA[fi];
                if (c >>> 24 === 170) {
                  FL[fi] = (c | 0xff000000) >>> 0;
                  FE[fi] = 1;
                  continue;
                }
                FL[fi] = pk(Math.min(255, (c & 255) * out[0]) | 0, Math.min(255, ((c >>> 8) & 255) * out[1]) | 0, Math.min(255, ((c >>> 16) & 255) * out[2]) | 0);
              }
            }
          }
          continue; // (as áreas pintadas são todas a céu aberto: sem teto)
        }
        for (let v = 0; v < FTX; v++) for (let u = 0; u < FTX; u++) {
          const wx = cx + (u + 0.5) / FTX;
          const wy = cy + (v + 0.5) / FTX;
          const gx = cx * FTX + u;
          const gy = cy * FTX + v;
          const c = tex.px[(gy % tex.h) * tex.w + (gx % tex.w)];
          let r = c & 255;
          let g = (c >>> 8) & 255;
          let b = (c >>> 16) & 255;
          let em = 0;
          // desenhos no chão de cada área
          if (id === 'saguao') {
            const dx = wx - 25;
            const dy = wy - 18.3;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dx) < 0.7 && (wy < 13.1 || (wy > 15.7 && wy < 16.7) || wy > 19.9)) {
              r = r * 0.5 + acc2[0] * 0.25;
              g = g * 0.5 + acc2[1] * 0.25;
              b = b * 0.5 + acc2[2] * 0.25;
              if (Math.abs(Math.abs(dx) - 0.62) < 0.04) {
                [r, g, b] = acc;
                em = 1;
              }
            }
            if (Math.abs(d - 1.6) < 0.06 || Math.abs(d - 1.35) < 0.025) {
              [r, g, b] = acc;
              em = 1;
            } else if (d < 1.35) {
              r *= 0.75;
              g *= 0.75;
              b *= 0.75;
              // símbolo da fase pintado no chão (cadeado, sol, taça ou bola)
              const icon = th.icon || 'lock';
              const paint = () => ([r, g, b] = acc.map((k) => k * 0.85));
              if (icon === 'lock') {
                const lockBody = Math.abs(dx) < 0.48 && dy > -0.12 && dy < 0.62;
                const shackle = dy < -0.08 && dy > -0.7 && Math.abs(Math.hypot(dx, dy + 0.12) - 0.34) < 0.08;
                if (lockBody || shackle) paint();
                if (lockBody && Math.abs(dx) < 0.07 && dy > 0.12 && dy < 0.4) [r, g, b] = [8, 12, 24];
              } else if (icon === 'sun') {
                if (d < 0.62) paint();
              } else if (icon === 'cup') {
                const bowl = dy > -0.6 && dy < 0.05 && Math.abs(dx) < 0.42 - Math.max(0, dy + 0.2) * 0.6;
                const stem = Math.abs(dx) < 0.09 && dy >= 0.05 && dy < 0.4;
                const base = Math.abs(dx) < 0.34 && dy >= 0.4 && dy < 0.58;
                if (bowl || stem || base) paint();
              } else if (d < 0.7) {
                paint();
                if (Math.hypot(dx, dy) < 0.16 || Math.hypot(dx - 0.36, dy + 0.3) < 0.12 || Math.hypot(dx + 0.36, dy + 0.3) < 0.12 || Math.hypot(dx, dy - 0.48) < 0.12) [r, g, b] = [8, 12, 24];
              }
            }
          } else if (id === 'campo') {
            if (Math.floor((wy - 6) / 1.4) % 2) {
              r *= 0.9;
              g *= 0.93;
              b *= 0.9;
            }
            const lx = Math.abs(wx - 53);
            const dc = Math.sqrt((wx - 53) * (wx - 53) + (wy - 14.5) * (wy - 14.5));
            const ln = 0.05;
            const inX = wx > 45.6 && wx < 60.4;
            const inY = wy > 6.6 && wy < 22.4;
            let line = false;
            if ((Math.abs(wx - 45.6) < ln || Math.abs(wx - 60.4) < ln) && inY) line = true;
            if ((Math.abs(wy - 6.6) < ln || Math.abs(wy - 22.4) < ln) && inX) line = true;
            if (Math.abs(wy - 14.5) < ln && inX) line = true;
            if (Math.abs(dc - 2) < ln || dc < 0.12) line = true;
            // grandes áreas e pequenas áreas nas duas pontas
            // (sem criar listas e funções a cada texel: o campo tem ~250 mil)
            for (let q = 0; q < 2; q++) {
              const dy = q ? 22.4 - wy : wy - 6.6;
              if ((Math.abs(lx - 3.4) < ln && dy > 0 && dy < 2.8) || (Math.abs(dy - 2.8) < ln && lx < 3.4)) line = true;
              if ((Math.abs(lx - 1.6) < ln && dy > 0 && dy < 1.1) || (Math.abs(dy - 1.1) < ln && lx < 1.6)) line = true;
            }
            if (line) [r, g, b] = [226, 232, 240];
          } else if (id === 'quarto') {
            if (wx > 11 && wx < 14 && wy > 24.6 && wy < 27.4) {
              const edge = wx < 11.12 || wx > 13.88 || wy < 24.72 || wy > 27.28;
              const rc = edge ? rug.map((k) => k * 0.6) : rug;
              const k2 = (u + v) % 4 === 0 ? 0.88 : 1;
              [r, g, b] = rc.map((k) => k * k2);
            }
          } else if (id === 'dorm' || id === 'treino') {
            const yA = id === 'dorm' ? 18.06 : 13.06;
            const yB = id === 'dorm' ? 20.94 : 15.94;
            if (Math.abs(wy - yA) < 0.025 || Math.abs(wy - yB) < 0.025) {
              [r, g, b] = acc;
              em = 1;
            }
            if (id === 'treino' && Math.abs(wy - 14.5) < 0.08 && wx > 34) [r, g, b] = [34, 197, 94];
          } else if (id === 'armas') {
            const d1 = Math.sqrt((wx - 24.5) * (wx - 24.5) + (wy - 29.1) * (wy - 29.1));
            const d2 = Math.sqrt((wx - 30.4) * (wx - 30.4) + (wy - 29.0) * (wy - 29.0));
            if (Math.abs(d1 - 1.45) < 0.05) {
              [r, g, b] = [250, 204, 21];
              em = 1;
            }
            if (Math.abs(d2 - 1.05) < 0.05) {
              [r, g, b] = [192, 132, 252];
              em = 1;
            }
          } else if (id === 'academia') {
            if (Math.abs(wy - 8.1) < 0.04 && wx < 40) [r, g, b] = [250, 204, 21];
          } else if (id === 'subsolo') {
            // degraus descendo: cada um mais escuro
            const k3 = 1 - Math.max(0, wy - 22) * 0.1;
            r *= k3;
            g *= k3;
            b *= k3;
          }
          const fi = gy * FW + gx;
          FA[fi] = (((em ? 170 : 255) << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
          if (!lit) continue;
          if (em) {
            FL[fi] = pk(r | 0, g | 0, b | 0);
            FE[fi] = 1;
          } else {
            this.light(wx, wy, out, true);
            FL[fi] = pk(Math.min(255, r * out[0]) | 0, Math.min(255, g * out[1]) | 0, Math.min(255, b * out[2]) | 0);
          }
        }
        // teto (a céu aberto não tem)
        if (OPEN[ai]) continue;
        const lampCell = cx % 3 === 1 && cy % 3 === 1;
        const ct = id === 'armas' ? (cx % 3 === 1 ? CT.strip : CT.dark) : id === 'academia' ? (cy % 2 ? CT.tube : CT.ceil) : lampCell ? CT.lamp : CT.ceil;
        for (let v = 0; v < CTX; v++) for (let u = 0; u < CTX; u++) {
          const wx = cx + (u + 0.5) / CTX;
          const wy = cy + (v + 0.5) / CTX;
          const ti = v * 16 + u;
          const c = ct.px[ti];
          const ci = (cy * CTX + v) * CW + cx * CTX + u;
          CA[ci] = ct.em && ct.em[ti] ? ((c & 0xffffff) | (170 << 24)) >>> 0 : c;
          if (!lit) continue;
          if (ct.em && ct.em[ti]) {
            CL[ci] = c;
            CE[ci] = 1;
          } else {
            this.light(wx, wy, out, false);
            const k = 0.62;
            CL[ci] = pk(Math.min(255, (c & 255) * out[0] * k) | 0, Math.min(255, ((c >>> 8) & 255) * out[1] * k) | 0, Math.min(255, ((c >>> 16) & 255) * out[2] * k) | 0);
          }
        }
      }
      this.FL = FL;
      this.FA = FA;
      this.CA = CA;
      this.FE = FE;
      this.CL = CL;
      this.CE = CE;
    },
    // céu do campo: degradê da noite e estrelas
    makeSky(th) {
      const SW = 1024;
      const SH = 128;
      const px = new Uint32Array(SW * SH);
      const top = th.skyTop || [3, 6, 18];
      const hor = th.skyHor || [22, 40, 78];
      for (let y = 0; y < SH; y++) {
        const k = y / (SH - 1);
        const kk = k * k;
        const c = pk((top[0] + (hor[0] - top[0]) * kk) | 0, (top[1] + (hor[1] - top[1]) * kk) | 0, (top[2] + (hor[2] - top[2]) * kk) | 0);
        for (let x = 0; x < SW; x++) px[y * SW + x] = c;
      }
      let s = 1234567;
      const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < (th.stars ?? 260); i++) {
        const x = Math.floor(rnd() * SW);
        const y = Math.floor(rnd() * SH * 0.8);
        const bri = 120 + Math.floor(rnd() * 135);
        px[y * SW + x] = pk(bri, bri, Math.min(255, bri + 20));
      }
      return { w: SW, h: SH, px };
    }
  };

  // ---------------------------------------------------------------- render
  const V = { W: 0, H: 0 };
  // k = tamanho de cada pixel na tela (inteiro: todos os pixels do mesmo tamanho)
  function setRes(vw, vh, k) {
    const H = Math.max(90, Math.ceil(vh / k));
    const W = Math.max(140, Math.ceil(vw / k));
    V.k = k;
    if (V.W === W && V.H === H) return;
    V.W = W;
    V.H = H;
    V.F = H * FOC;
    V.hz = Math.round(H * HZK);
    V.plen = W / 2 / V.F;
    V.cv = canvas(W, H);
    V.g = V.cv.getContext('2d');
    V.img = V.g.createImageData(W, H);
    V.buf = new Uint32Array(V.img.data.buffer);
    V.zb = new Float32Array(W * H);
    V.ecv = canvas(W, H);
    V.eg = V.ecv.getContext('2d');
    V.eimg = V.eg.createImageData(W, H);
    V.eb = new Uint32Array(V.eimg.data.buffer);
    V.b1 = canvas(W / 2, H / 2);
    V.b2 = canvas(W / 4, H / 4);
    V.b3 = canvas(W / 8, H / 8);
    V.rdx = new Float32Array(W);
    V.rdy = new Float32Array(W);
    V.skyU = new Int32Array(W);
  }
  const AOTAB = (() => {
    const a = new Float32Array(TH);
    for (let v = 0; v < TH; v++) {
      const k = v / (TH - 1);
      let f = 1;
      if (k > 0.82) f = 1 - ((k - 0.82) / 0.18) * 0.42;
      if (k < 0.08) f = 0.82 + (k / 0.08) * 0.18;
      a[v] = f;
    }
    return a;
  })();
  const LT = [0, 0, 0];
  const REFL = new Float32Array(AREA_IDS.length); // reflexo do chão por área
  const HITB = [];
  function render(cam, sprites) {
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const hz = V.hz;
    const buf = V.buf;
    const zb = V.zb;
    const eb = V.eb;
    const m = World.map;
    const solid = m.solid;
    const areaA = m.area;
    eb.fill(0);
    const dirX = Math.cos(cam.a);
    const dirY = Math.sin(cam.a);
    const plX = -dirY * V.plen;
    const plY = dirX * V.plen;
    const posX = cam.x;
    const posY = cam.y;
    const fog = World.fog;
    const fr = fog[0];
    const fg = fog[1];
    const fb = fog[2];
    const camArea = areaA[Math.floor(posY) * MW + Math.floor(posX)];
    const skyAll = OPEN[camArea] === 1; // (câmera a céu aberto: o "teto" inteiro é céu)
    const RW = m.rows; // (linhas com chão montado)
    const sky = World.sky;
    for (let x = 0; x < W; x++) {
      const k = (2 * (x + 0.5)) / W - 1;
      V.rdx[x] = dirX + plX * k;
      V.rdy[x] = dirY + plY * k;
      const ang = Math.atan2(V.rdy[x], V.rdx[x]);
      V.skyU[x] = ((((ang / (Math.PI * 2)) * sky.w * 2) | 0) % sky.w + sky.w) % sky.w;
    }
    const FL = World.FL;
    const FE = World.FE;
    const CL = World.CL;
    const CE = World.CE;
    const FW = MW * FTX;
    const CW = MW * CTX;
    // ---- chão e teto (linha por linha)
    for (let y = 0; y < H; y++) {
      const floor = y >= hz;
      const p = floor ? y + 0.5 - hz : hz - y - 0.5;
      const rowDist = ((floor ? CZ : WALL_H - CZ) * F) / p;
      let f = 1.12 - rowDist / 22;
      if (f > 1) f = 1;
      else if (f < 0.15) f = 0.15;
      const nf = 1 - f;
      const fR = fr * nf;
      const fG = fg * nf;
      const fB = fb * nf;
      const row = y * W;
      const sx = (rowDist * 2 * plX) / W;
      const sy = (rowDist * 2 * plY) / W;
      let wx = posX + rowDist * (dirX - plX) + sx * 0.5;
      let wy = posY + rowDist * (dirY - plY) + sy * 0.5;
      const skyRow = (Math.min(1, y / Math.max(1, hz)) * (sky.h - 1)) | 0;
      for (let x = 0; x < W; x++, wx += sx, wy += sy) {
        const i = row + x;
        zb[i] = rowDist;
        if (wx < 0 || wy < 0 || wx >= MW || wy >= RW) {
          buf[i] = floor ? 0xff0a0604 : sky.px[skyRow * sky.w + V.skyU[x]];
          continue;
        }
        let c;
        if (floor) {
          const fi = ((wy * FTX) | 0) * FW + ((wx * FTX) | 0);
          c = FL[fi];
          if (FE[fi]) {
            buf[i] = c;
            eb[i] = c;
            continue;
          }
        } else {
          const ai = areaA[(wy | 0) * MW + (wx | 0)];
          if (skyAll || ai < 0 || OPEN[ai]) {
            buf[i] = sky.px[skyRow * sky.w + V.skyU[x]];
            zb[i] = 1e9;
            continue;
          }
          const ci = ((wy * CTX) | 0) * CW + ((wx * CTX) | 0);
          c = CL[ci];
          if (CE[ci]) {
            buf[i] = c;
            eb[i] = c;
            continue;
          }
        }
        if (c === 0) c = 0xff0a0604;
        buf[i] = (0xff000000 | ((((c >>> 16) & 255) * f + fB) << 16) | ((((c >>> 8) & 255) * f + fG) << 8) | ((c & 255) * f + fR)) >>> 0;
      }
    }
    // ---- paredes e móveis (coluna por coluna)
    const boxes = World.boxes;
    const bcell = World.bcell;
    const bseen = World.bseen;
    const faces = m.face;
    let stamp = V.stamp || 0;
    for (let x = 0; x < W; x++) {
      const rdx = V.rdx[x];
      const rdy = V.rdy[x];
      let mx = posX | 0;
      let my = posY | 0;
      const ddx = Math.abs(1 / rdx);
      const ddy = Math.abs(1 / rdy);
      const stx = rdx < 0 ? -1 : 1;
      const sty = rdy < 0 ? -1 : 1;
      let sdx = rdx < 0 ? (posX - mx) * ddx : (mx + 1 - posX) * ddx;
      let sdy = rdy < 0 ? (posY - my) * ddy : (my + 1 - posY) * ddy;
      let side = 0;
      let hit = false;
      let prevX = mx;
      let prevY = my;
      HITB.length = 0;
      stamp++;
      for (let n = 0; n < 96; n++) {
        const bl = bcell[my * MW + mx];
        if (bl) for (let j = 0; j < bl.length; j++) if (bseen[bl[j]] !== stamp) {
          bseen[bl[j]] = stamp;
          HITB.push(bl[j]);
        }
        prevX = mx;
        prevY = my;
        if (sdx < sdy) {
          sdx += ddx;
          mx += stx;
          side = 0;
        } else {
          sdy += ddy;
          my += sty;
          side = 1;
        }
        if (mx < 0 || my < 0 || mx >= MW || my >= MH || solid[my * MW + mx] !== 0) {
          hit = true;
          break;
        }
      }
      let perp = 1e9;
      if (hit) {
        perp = side === 0 ? sdx - ddx : sdy - ddy;
        let wallX = side === 0 ? posY + perp * rdy : posX + perp * rdx;
        wallX -= Math.floor(wallX);
        const dir = side === 0 ? (stx > 0 ? 'W' : 'E') : sty > 0 ? 'N' : 'S';
        const inb = mx >= 0 && my >= 0 && mx < MW && my < MH;
        const fai = areaA[prevY * MW + prevX];
        const style = AREAS[AREA_IDS[fai >= 0 ? fai : 2]].wall;
        const special = inb ? (faces[my * MW + mx] || {})[dir] : null;
        let tex;
        // u da esquerda para a direita, olhando a parede de frente
        let tu = dir === 'W' || dir === 'S' ? wallX : 1 - wallX;
        if (special && special.startsWith('screen:')) {
          tex = World.screenTex;
          tu = (Number(special.slice(7)) + tu) / 4;
        } else tex = World.wallTex(special || (inb && solid[my * MW + mx] === 2 ? 'pillar' : 'base'), style);
        const top = hz - ((WALL_H - CZ) * F) / perp;
        const lineH = (WALL_H * F) / perp;
        const y0 = Math.max(0, Math.ceil(top - 0.5));
        const y1 = Math.min(H, Math.ceil(top + lineH - 0.5));
        const tw = tex.w;
        const tht = tex.h;
        const u = Math.min(tw - 1, (tu * tw) | 0);
        World.light(posX + rdx * (perp - 0.08), posY + rdy * (perp - 0.08), LT, false);
        let f = 1.12 - perp / 22;
        if (f > 1) f = 1;
        else if (f < 0.15) f = 0.15;
        const sideK = side === 1 ? 0.84 : 1;
        const lr = LT[0] * f * sideK;
        const lg = LT[1] * f * sideK;
        const lb = LT[2] * f * sideK;
        const nf = 1 - f;
        const fR = fr * nf;
        const fG = fg * nf;
        const fB = fb * nf;
        const vStep = tht / lineH;
        let v = (y0 + 0.5 - top) * vStep;
        const em = tex.em;
        const tpx = tex.px;
        const aoK = TH / tht;
        for (let y = y0; y < y1; y++, v += vStep) {
          const vi = v < tht ? (v > 0 ? v | 0 : 0) : tht - 1;
          const ti = vi * tw + u;
          const c = tpx[ti];
          const i = y * W + x;
          zb[i] = perp;
          if (em && em[ti]) {
            buf[i] = c;
            eb[i] = c;
            continue;
          }
          eb[i] = 0;
          const ao = AOTAB[(vi * aoK) | 0];
          buf[i] = (0xff000000 | ((Math.min(255, ((c >>> 16) & 255) * lb * ao) + fB) << 16) | ((Math.min(255, ((c >>> 8) & 255) * lg * ao) + fG) << 8) | (Math.min(255, (c & 255) * lr * ao) + fR)) >>> 0;
        }
        // chão encerado: a parede (e os letreiros acesos) refletida no chão, sumindo aos poucos
        const refl = REFL[fai >= 0 ? fai : 2];
        if (refl > 0 && y1 < H && y1 > y0) {
          const len = Math.min(H - y1, Math.ceil((y1 - y0) * 0.75));
          for (let n = 0; n < len; n++) {
            const ys = y1 - 1 - n;
            if (ys < y0) break;
            const i = (y1 + n) * W + x;
            const si = ys * W + x;
            const a = refl * (1 - n / len) * (1 - n / len);
            const ia = 1 - a;
            const c = buf[i];
            const s = buf[si];
            buf[i] = (0xff000000 | ((((c >>> 16) & 255) * ia + ((s >>> 16) & 255) * a) << 16) | ((((c >>> 8) & 255) * ia + ((s >>> 8) & 255) * a) << 8) | ((c & 255) * ia + (s & 255) * a)) >>> 0;
            const e = eb[si];
            if (e) {
              const k2 = a * 0.9;
              eb[i] = (0xff000000 | ((((e >>> 16) & 255) * k2) << 16) | ((((e >>> 8) & 255) * k2) << 8) | ((e & 255) * k2)) >>> 0;
            }
          }
        }
      }
      // móveis (caixas) que o raio cruzou, com teste de profundidade
      for (let j = 0; j < HITB.length; j++) drawBox(boxes[HITB[j]], x, rdx, rdy, posX, posY, perp);
    }
    V.stamp = stamp;
    // ---- sombras redondas no chão e bonecos/enfeites em pé
    const rX = -dirY;
    const rY = dirX;
    const proj = [];
    for (let k = 0; k < sprites.length; k++) {
      const s = sprites[k];
      const dx = s.x - posX;
      const dy = s.y - posY;
      const depth = dx * dirX + dy * dirY;
      if (depth < 0.2 || depth > 22) continue;
      const lat = dx * rX + dy * rY;
      const sx = W / 2 + (lat / depth) * F;
      if (sx < -W || sx > W * 2) continue;
      proj.push({ s, depth, sx });
    }
    for (let k = 0; k < proj.length; k++) {
      const { s, depth, sx } = proj[k];
      if (s.shadow && !(s.z > 0)) drawShadow(sx, depth, s.shadow);
    }
    for (let k = 0; k < proj.length; k++) if (proj[k].s.npc || proj[k].s.me) drawReflection(proj[k]);
    for (let k = 0; k < proj.length; k++) drawSprite(proj[k]);
    drawDust(posX, posY, dirX, dirY, Hub.t);
    grade();
    V.g.putImageData(V.img, 0, 0);
  }
  // uma caixa numa coluna: frente (a face por onde o raio entra), tampo ou fundo
  function drawBox(b, x, rdx, rdy, posX, posY, perp) {
    let t0 = -1e9;
    let t1 = 1e9;
    let ax = -1;
    if (rdx !== 0) {
      let a = (b.x0 - posX) / rdx;
      let c = (b.x1 - posX) / rdx;
      if (a > c) {
        const s = a;
        a = c;
        c = s;
      }
      if (a > t0) {
        t0 = a;
        ax = 0;
      }
      if (c < t1) t1 = c;
    } else if (posX < b.x0 || posX > b.x1) return;
    if (rdy !== 0) {
      let a = (b.y0 - posY) / rdy;
      let c = (b.y1 - posY) / rdy;
      if (a > c) {
        const s = a;
        a = c;
        c = s;
      }
      if (a > t0) {
        t0 = a;
        ax = 1;
      }
      if (c < t1) t1 = c;
    } else if (posY < b.y0 || posY > b.y1) return;
    if (t1 <= NEAR || t0 >= t1 || t0 >= perp) return;
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const hz = V.hz;
    const buf = V.buf;
    const zb = V.zb;
    const eb = V.eb;
    const fog = World.fog;
    const tn = Math.max(t0, NEAR);
    const tf = Math.min(t1, perp);
    if (CZ > b.z1 && b.f.T) {
      const dz = CZ - b.z1;
      const ya = Math.max(0, Math.ceil(hz + (dz * F) / tf - 0.5));
      const yb = Math.min(H, Math.ceil(hz + (dz * F) / tn - 0.5));
      const tex = b.f.T;
      for (let y = ya; y < yb; y++) {
        const p = y + 0.5 - hz;
        if (p <= 0) continue;
        const d = (dz * F) / p;
        const i = y * W + x;
        if (d >= zb[i]) continue;
        const wx = posX + rdx * d;
        const wy = posY + rdy * d;
        let u = ((wx - b.x0) * b.iw * tex.w) | 0;
        let v = ((wy - b.y0) * b.id2 * tex.h) | 0;
        if (u < 0) u = 0;
        else if (u >= tex.w) u = tex.w - 1;
        if (v < 0) v = 0;
        else if (v >= tex.h) v = tex.h - 1;
        const ti = v * tex.w + u;
        const c = tex.px[ti];
        if (c >>> 24 < 128) continue;
        zb[i] = d;
        if (tex.em && tex.em[ti]) {
          buf[i] = c;
          eb[i] = c;
          continue;
        }
        World.light(wx, wy, LT, false);
        put(i, c, LT[0] * 1.08, LT[1] * 1.08, LT[2] * 1.08, d, fog);
      }
    } else if (CZ < b.z0 && b.f.B) {
      const dz = b.z0 - CZ;
      const ya = Math.max(0, Math.ceil(hz - (dz * F) / tn - 0.5));
      const yb = Math.min(H, Math.ceil(hz - (dz * F) / tf - 0.5));
      const tex = b.f.B;
      for (let y = ya; y < yb; y++) {
        const p = hz - y - 0.5;
        if (p <= 0) continue;
        const d = (dz * F) / p;
        const i = y * W + x;
        if (d >= zb[i]) continue;
        const wx = posX + rdx * d;
        const wy = posY + rdy * d;
        const u = Math.max(0, Math.min(tex.w - 1, ((wx - b.x0) * b.iw * tex.w) | 0));
        const v = Math.max(0, Math.min(tex.h - 1, ((wy - b.y0) * b.id2 * tex.h) | 0));
        const ti = v * tex.w + u;
        const c = tex.px[ti];
        zb[i] = d;
        if (tex.em && tex.em[ti]) {
          buf[i] = c;
          eb[i] = c;
          continue;
        }
        World.light(wx, wy, LT, false);
        put(i, c, LT[0] * 0.6, LT[1] * 0.6, LT[2] * 0.6, d, fog);
      }
    }
    if (t0 < NEAR) return;
    const dir = ax === 0 ? (rdx > 0 ? 'W' : 'E') : rdy > 0 ? 'N' : 'S';
    const tex = b.f[dir];
    if (!tex) return;
    const hx = posX + rdx * t0;
    const hy = posY + rdy * t0;
    let tu;
    if (dir === 'S') tu = (hx - b.x0) * b.iw;
    else if (dir === 'N') tu = (b.x1 - hx) * b.iw;
    else if (dir === 'W') tu = (hy - b.y0) * b.id2;
    else tu = (b.y1 - hy) * b.id2;
    const u = Math.max(0, Math.min(tex.w - 1, (tu * tex.w) | 0));
    const yA = hz + ((CZ - b.z1) * F) / t0;
    const yB = hz + ((CZ - b.z0) * F) / t0;
    const y0 = Math.max(0, Math.ceil(yA - 0.5));
    const y1 = Math.min(H, Math.ceil(yB - 0.5));
    if (y1 <= y0) return;
    const nx = dir === 'W' ? -0.06 : dir === 'E' ? 0.06 : 0;
    const ny = dir === 'N' ? -0.06 : dir === 'S' ? 0.06 : 0;
    World.light(hx + nx, hy + ny, LT, false);
    const k = ax === 1 ? 0.86 : 1;
    const lr = LT[0] * k;
    const lg = LT[1] * k;
    const lb = LT[2] * k;
    const vStep = tex.h / (yB - yA);
    let v = (y0 + 0.5 - yA) * vStep;
    const grounded = b.z0 < 0.02;
    for (let y = y0; y < y1; y++, v += vStep) {
      const i = y * W + x;
      if (t0 >= zb[i]) continue;
      const vi = v < tex.h ? (v > 0 ? v | 0 : 0) : tex.h - 1;
      const ti = vi * tex.w + u;
      const c = tex.px[ti];
      if (c >>> 24 < 128) continue;
      zb[i] = t0;
      if (tex.em && tex.em[ti]) {
        buf[i] = c;
        eb[i] = c;
        continue;
      }
      // um pouco mais escuro perto do chão (contato)
      const ao = grounded ? 0.72 + 0.28 * Math.min(1, (1 - vi / tex.h) * 4) : 1;
      put(i, c, lr * ao, lg * ao, lb * ao, t0, fog);
    }
  }
  // cor com luz e névoa
  function litc(c, lr, lg, lb, d, fog) {
    let f = 1.12 - d / 22;
    if (f > 1) f = 1;
    else if (f < 0.15) f = 0.15;
    const nf = 1 - f;
    const r = Math.min(255, (c & 255) * lr) * f + fog[0] * nf;
    const g = Math.min(255, ((c >>> 8) & 255) * lg) * f + fog[1] * nf;
    const b = Math.min(255, ((c >>> 16) & 255) * lb) * f + fog[2] * nf;
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }
  function put(i, c, lr, lg, lb, d, fog) {
    V.buf[i] = litc(c, lr, lg, lb, d, fog);
    V.eb[i] = 0;
  }
  function drawShadow(sx, depth, r) {
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const yF = V.hz + (CZ * F) / depth;
    const rx = (r * F) / depth;
    const ry = Math.max(1, (CZ * F * r) / (depth * depth));
    const x0 = Math.max(0, Math.floor(sx - rx));
    const x1 = Math.min(W - 1, Math.ceil(sx + rx));
    const y0 = Math.max(0, Math.floor(yF - ry));
    const y1 = Math.min(H - 1, Math.ceil(yF + ry));
    const buf = V.buf;
    const zb = V.zb;
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - yF) / ry;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - sx) / rx;
        const q = 1 - (dx * dx + dy * dy);
        if (q <= 0) continue;
        const i = y * W + x;
        const z = zb[i];
        if (z < depth - r * 2 || z > depth + r * 2) continue;
        const k = 1 - 0.5 * Math.min(1, q * 2.2);
        const c = buf[i];
        buf[i] = (0xff000000 | ((((c >>> 16) & 255) * k) << 16) | ((((c >>> 8) & 255) * k) << 8) | ((c & 255) * k)) >>> 0;
      }
    }
  }
  function drawSprite(pj) {
    const { s, depth, sx } = pj;
    const tex = s.tex;
    if (!tex) return;
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const k = s.k || 1;
    const sw = ((tex.w / SPX) * k * F) / depth;
    const shh = ((tex.h / SPX) * k * F) / depth;
    const z = (s.z || 0) + (s.bob !== undefined ? 0.05 * Math.sin(Hub.t * 0.06 + s.bob) : 0);
    const yBot = V.hz + ((CZ - z) * F) / depth + (s.foot || 0) * shh;
    const yTop = yBot - shh;
    const xL = sx - sw / 2;
    const x0 = Math.max(0, Math.ceil(xL - 0.5));
    const x1 = Math.min(W, Math.ceil(xL + sw - 0.5));
    const y0 = Math.max(0, Math.ceil(yTop - 0.5));
    const y1 = Math.min(H, Math.ceil(yBot - 0.5));
    if (x1 <= x0 || y1 <= y0) return;
    World.light(s.x, s.y, LT, false);
    const lift = s.npc || s.me ? 0.12 : 0.05;
    const lr = LT[0] + lift;
    const lg = LT[1] + lift;
    const lb = LT[2] + lift;
    const fog = World.fog;
    const buf = V.buf;
    const zb = V.zb;
    const eb = V.eb;
    const tw = tex.w;
    const tht = tex.h;
    const px = tex.px;
    const em = tex.em;
    const glow = s.glow;
    const ghost = s.ghost;
    for (let x = x0; x < x1; x++) {
      const u = (((x + 0.5 - xL) / sw) * tw) | 0;
      if (u < 0 || u >= tw) continue;
      for (let y = y0; y < y1; y++) {
        const i = y * W + x;
        if (depth >= zb[i]) continue;
        const v = (((y + 0.5 - yTop) / shh) * tht) | 0;
        if (v < 0 || v >= tht) continue;
        const ti = v * tw + u;
        const c = px[ti];
        if (c >>> 24 < 128) continue;
        if (ghost) {
          // câmera colada em você: o seu boneco fica meio transparente
          const old = buf[i];
          put(i, c, lr, lg, lb, depth, fog);
          const nw = buf[i];
          const a = ghost;
          const r = (old & 255) * (1 - a) + (nw & 255) * a;
          const g = ((old >>> 8) & 255) * (1 - a) + ((nw >>> 8) & 255) * a;
          const b = ((old >>> 16) & 255) * (1 - a) + ((nw >>> 16) & 255) * a;
          buf[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
          continue;
        }
        zb[i] = depth;
        if (glow || (em && em[ti])) {
          buf[i] = (c | 0xff000000) >>> 0;
          eb[i] = (c | 0xff000000) >>> 0;
          continue;
        }
        put(i, c, lr, lg, lb, depth, fog);
      }
    }
  }
  // reflexo do boneco no chão encerado: de cabeça para baixo, embaixo dos pés, sumindo
  function drawReflection(pj) {
    const { s, depth, sx } = pj;
    const tex = s.tex;
    if (!tex || (s.z || 0) > 0.05) return;
    const ai = World.map.area[Math.floor(s.y) * MW + Math.floor(s.x)];
    const Rf = ai >= 0 ? REFL[ai] : 0;
    if (Rf <= 0.05) return;
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const hz = V.hz;
    const k = s.k || 1;
    const sw = ((tex.w / SPX) * k * F) / depth;
    const shh = ((tex.h / SPX) * k * F) / depth;
    const yFoot = hz + (CZ * F) / depth;
    const yTop = yFoot + (s.foot || 0) * shh - shh;
    const xL = sx - sw / 2;
    const x0 = Math.max(0, Math.ceil(xL - 0.5));
    const x1 = Math.min(W, Math.ceil(xL + sw - 0.5));
    const yS = Math.max(0, Math.ceil(yFoot - 0.5));
    const yE = Math.min(H, Math.ceil(2 * yFoot - yTop));
    if (x1 <= x0 || yE <= yS) return;
    World.light(s.x, s.y, LT, false);
    const lr = LT[0] + 0.12;
    const lg = LT[1] + 0.12;
    const lb = LT[2] + 0.12;
    const fog = World.fog;
    const buf = V.buf;
    const zb = V.zb;
    const tw = tex.w;
    const tht = tex.h;
    const px = tex.px;
    const span = Math.max(1, 2 * yFoot - yTop - yFoot);
    for (let x = x0; x < x1; x++) {
      const u = (((x + 0.5 - xL) / sw) * tw) | 0;
      if (u < 0 || u >= tw) continue;
      for (let y = yS; y < yE; y++) {
        const yo = 2 * yFoot - (y + 0.5);
        const v = (((yo - yTop) / shh) * tht) | 0;
        if (v < 0 || v >= tht) continue;
        const c = px[v * tw + u];
        if (c >>> 24 < 128) continue;
        const i = y * W + x;
        const p = y + 0.5 - hz;
        if (p <= 0) continue;
        const fd = (CZ * F) / p;
        if (Math.abs(zb[i] - fd) > fd * 0.04) continue; // só onde é chão
        const a = Rf * 0.8 * (1 - (y - yFoot) / span);
        if (a <= 0) continue;
        const s2 = litc(c, lr, lg, lb, depth, fog);
        const o = buf[i];
        const ia = 1 - a;
        buf[i] = (0xff000000 | ((((o >>> 16) & 255) * ia + ((s2 >>> 16) & 255) * a) << 16) | ((((o >>> 8) & 255) * ia + ((s2 >>> 8) & 255) * a) << 8) | ((o & 255) * ia + (s2 & 255) * a)) >>> 0;
      }
    }
  }
  // poeira flutuando na luz (perto da câmera), brilhando de leve
  function drawDust(posX, posY, dirX, dirY, t) {
    const W = V.W;
    const H = V.H;
    const F = V.F;
    const hz = V.hz;
    const buf = V.buf;
    const zb = V.zb;
    const m = World.map;
    const rX = -dirY;
    const rY = dirX;
    const cx0 = Math.floor(posX);
    const cy0 = Math.floor(posY);
    for (let cy = cy0 - 7; cy <= cy0 + 7; cy++) for (let cx = cx0 - 7; cx <= cx0 + 7; cx++) {
      if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) continue;
      const idx = cy * MW + cx;
      if (m.solid[idx] || m.area[idx] < 0 || OPEN[m.area[idx]]) continue;
      const h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
      const ph = ((h & 1023) / 1023) * 6.283;
      const x = cx + ((h >>> 10) & 255) / 255 + Math.sin(t * 0.004 + ph) * 0.25;
      const y = cy + ((h >>> 18) & 255) / 255 + Math.cos(t * 0.003 + ph) * 0.25;
      const z = 0.25 + (((h >>> 4) & 255) / 255) * 1.3 + Math.sin(t * 0.006 + ph * 2) * 0.1;
      const dx = x - posX;
      const dy = y - posY;
      const depth = dx * dirX + dy * dirY;
      if (depth < 0.5 || depth > 9) continue;
      const sx = (W / 2 + ((dx * rX + dy * rY) / depth) * F) | 0;
      const sy = (hz + ((CZ - z) * F) / depth) | 0;
      if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H) continue;
      const i = sy * W + sx;
      if (zb[i] <= depth) continue;
      World.light(x, y, LT, false);
      const k = Math.min(1, (LT[0] + LT[1] + LT[2]) / 3) * (0.45 + 0.55 * Math.sin(t * 0.05 + ph * 3)) * (1 - depth / 9) * 80;
      if (k <= 4) continue;
      const add = (j) => {
        const c = buf[j];
        const r = Math.min(255, (c & 255) + k);
        const g = Math.min(255, ((c >>> 8) & 255) + k);
        const b = Math.min(255, ((c >>> 16) & 255) + k * 0.9);
        buf[j] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      };
      add(i);
      if (depth < 2.5) add(i + 1);
    }
  }
  // acabamento de cor: um pouco mais de contraste e de cor (curva suave)
  const GRADE = (() => {
    const a = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      const t = v / 255;
      const s = t * t * (3 - 2 * t);
      a[v] = Math.max(0, Math.min(255, Math.round((t + (s - t) * 0.35) * 255 * 1.03 + 2)));
    }
    return a;
  })();
  function grade() {
    const buf = V.buf;
    const n = V.W * V.H;
    for (let i = 0; i < n; i++) {
      const c = buf[i];
      const r0 = c & 255;
      const g0 = (c >>> 8) & 255;
      const b0 = (c >>> 16) & 255;
      const l = (r0 * 77 + g0 * 150 + b0 * 29) >> 8;
      let r = l + (r0 - l) * 1.18;
      let g = l + (g0 - l) * 1.18;
      let b = l + (b0 - l) * 1.18;
      r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
      g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
      b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
      buf[i] = (0xff000000 | (GRADE[b] << 16) | (GRADE[g] << 8) | GRADE[r]) >>> 0;
    }
  }
  // brilho: o que é aceso, reduzido em 3 tamanhos e somado por cima (suave)
  function bloom(o, OW, OH) {
    V.eg.putImageData(V.eimg, 0, 0);
    let src = V.ecv;
    [V.b1, V.b2, V.b3].forEach((c) => {
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(src, 0, 0, c.width, c.height);
      src = c;
    });
    o.save();
    o.globalCompositeOperation = 'lighter';
    o.imageSmoothingEnabled = true;
    o.globalAlpha = 0.4;
    o.drawImage(V.b1, 0, 0, OW, OH);
    o.globalAlpha = 0.5;
    o.drawImage(V.b2, 0, 0, OW, OH);
    o.globalAlpha = 0.55;
    o.drawImage(V.b3, 0, 0, OW, OH);
    o.restore();
  }

  // ---------------------------------------------------------------- bonecos
  const CHARSZ = 72;
  const CHAR = [];
  function charTex(slot, cd, opt) {
    const key = `${opt.view}|${opt.left ? 1 : 0}|${opt.animState}|${opt.frame}|${(opt.accessories || []).join(',')}`;
    let c = CHAR[slot];
    if (c && c.key === key && c.cd === cd) return c.tex;
    if (!c) {
      c = CHAR[slot] = { cv: canvas(CHARSZ, CHARSZ) };
      c.g = c.cv.getContext('2d', { willReadFrequently: true });
    }
    c.key = key;
    c.cd = cd;
    const g = c.g;
    g.clearRect(0, 0, CHARSZ, CHARSZ);
    g.imageSmoothingEnabled = false;
    PR().drawCharacterSprite(g, cd, CHARSZ, CHARSZ, Object.assign({ facing: 'front', accessories: [], shirtNumber: cd.number || 10 }, opt));
    const id = g.getImageData(0, 0, CHARSZ, CHARSZ);
    c.tex = { w: CHARSZ, h: CHARSZ, px: new Uint32Array(id.data.buffer), em: null };
    return c.tex;
  }

  // ---------------------------------------------------------------- Hub em 3D
  const SPAWN = { quarto: [12.5, 26.8, -Math.PI / 2], saguao: [25, 19.5, -Math.PI / 2] };
  const ACTL = { PROFILE: 'ABRIR ARMÁRIO (PERFIL)', ESTATISTICAS: 'USAR O PC (ATRIBUTOS)', OBJECTIVES: 'VER O MURAL (OBJETIVOS)', CONQUISTAS: 'VER OS TROFÉUS (CONQUISTAS)', SLEEP: 'DESCANSAR (SALVAR O JOGO)', TREINO: 'TREINAR (TREINOS)', EQUIPE: 'VER A ESCALAÇÃO (EQUIPE)', LOJA: 'COMPRAR (LOJA)', ARMAS: 'GIRAR A ROLETA (ARMAS)', FLUXO: 'ENTRAR NO TUBO (FLUXO)', HISTORIA: 'PRÓXIMO CAPÍTULO (HISTÓRIA)' };
  // lugares com ação (x, y no chão; h = altura da setinha)
  const SPOTS = [
    { x: 9.6, y: 24.0, act: 'SLEEP', h: 0.75 },
    { x: 15.3, y: 28.3, act: 'ESTATISTICAS', h: 1.15 },
    { x: 15.8, y: 23.95, act: 'PROFILE', h: 1.35 },
    { x: 14.0, y: 22.15, act: 'CONQUISTAS', h: 1.25 },
    { x: 11.0, y: 29.85, act: 'OBJECTIVES', h: 1.15 },
    { x: 25.0, y: 9.15, act: 'HISTORIA', h: 1.5 },
    { x: 18.8, y: 11.5, act: 'LOJA', h: 0.95 },
    { x: 21.15, y: 9.6, act: 'LOJA', h: 1.0 },
    { x: 4.1, y: 10.5, act: 'EQUIPE', h: 1.15 },
    { x: 37.4, y: 7.2, act: 'TREINO', h: 1.1 },
    { x: 42.3, y: 8.3, act: 'TREINO', h: 1.1 },
    { x: 40.1, y: 10.0, act: 'TREINO', h: 0.9 },
    { x: 53.0, y: 6.9, act: 'TREINO', h: 1.25 },
    { x: 53.0, y: 22.1, act: 'TREINO', h: 1.25 },
    { x: 24.5, y: 29.6, act: 'ARMAS', h: 1.6 },
    { x: 30.4, y: 29.5, act: 'FLUXO', h: 1.6 },
    { x: 27.5, y: 32.1, act: 'ARMAS', h: 1.0 }
  ];

  Object.assign(Hub, {
    mode3d: true,
    drawUnder: true, // o 3D continua desenhando atrás da janela de vidro
    px: SPAWN.quarto[0],
    py: SPAWN.quarto[1],
    ang: SPAWN.quarto[2],
    camA: SPAWN.quarto[2],
    area: 'quarto',
    q3: 216,

    go(id) {
      const s = SPAWN[id] || SPAWN.quarto;
      this.px = s[0];
      this.py = s[1];
      this.ang = s[2];
      this.camA = s[2];
      this.area = id;
      this.room = id;
      this.S = null;
      this.bubble = null;
      this._back = undefined;
      if (this.hud) this.hud.querySelector('.hub-room').textContent = this.areaName(id);
    },
    areaName(a) {
      if (a === 'quarto' && this.theme().id === 'pro') return 'SEU APARTAMENTO';
      return AREAS[a] ? AREAS[a].name : '';
    },
    theme3() {
      const th = this.theme();
      // (montar o prédio e as texturas é lento no começo; não conta para a qualidade)
      if (World.prepare(th)) {
        this._ms = undefined;
        this._qT = this.t;
        // a fase mudou com você na rua (a cidade só existe no tema pro) ou dentro de uma
        // parede: volta para o quarto. (fora das cenas: elas põem você em lugares de fora)
        if (!this.sk && !this.cine && !this.vn3d && World.isSolid(Math.floor(this.px), Math.floor(this.py))) this.go('quarto');
      }
      return th;
    },
    // a cidade está aberta agora? (tema pro e a planta com a cidade montada)
    cityOn() {
      return !!(World.map && World.map.city);
    },
    // companheiros pelo prédio (da escalação do capítulo atual); na rua, os pedestres
    npcs() {
      if (this._npcT === this.t && this._npcs) return this._npcs;
      // (na portaria e na cidade os companheiros do prédio nem aparecem: só quem passa na rua)
      if (this.cityOn() && CITY() && CITY().inCity(this.area)) {
        this._npcT = this.t;
        this._npcs = CITY().npcs(this, World);
        return this._npcs;
      }
      const App = window.App;
      const ch = App.getChapter?.();
      let ids = (ch?.teammateIds || []).filter((id) => (window.BLUE_LOCK_CHARACTERS || []).some((c) => c.id === id));
      if (ids.length < 3) ids = ['bachira', 'kunigami', 'chigiri', 'nagi', 'reo', 'barou'];
      const out = [];
      const add = (id, x, y, ang, o = {}) => {
        if (!id) return;
        const cd = charCd(id);
        if (cd) out.push(Object.assign({ id, cd, x, y, ang, anim: 'idle', z: 0 }, o));
      };
      add('anri', 18.8, 10.35, Math.PI / 2);
      add(ids[0], 13.6, 19.4, Math.PI);
      add(ids[1], 7.2, 9.15, Math.PI / 2);
      add(ids[2], 12.4, 11.45, -Math.PI / 2);
      add(ids[3], 8.0, 13.75, -Math.PI / 2);
      add(ids[4], 23.3, 17.0, 0);
      add(ids[5], 24.25, 17.0, Math.PI);
      const used = new Set(ids.slice(0, 6));
      const gym = ids[6] || ['kunigami', 'barou', 'gagamaru', 'raichi'].find((x) => !used.has(x)) || 'kunigami';
      add(gym, 36.0, 7.15, -Math.PI / 2, { anim: 'run', busy: true, z: 0.16 });
      // um correndo no campo, indo e voltando
      const p = (this.t * 0.035) % 20;
      const fwd = p < 10;
      const run = ['chigiri', 'bachira', 'nagi'].find((x) => !used.has(x) && x !== gym) || 'chigiri';
      add(run, 48 + (fwd ? p : 20 - p), 18.6, fwd ? 0 : Math.PI, { anim: 'run', busy: true, ghostSolid: true });
      out.forEach((n, i) => {
        n.idx = i;
        if (n.busy) return;
        const d = Math.hypot(this.px - n.x, this.py - n.y);
        if (d < 3) n.ang = Math.atan2(this.py - n.y, this.px - n.x);
        else if (Math.floor((this.t + i * 173) / 240) % 4 === 1) n.ang += Math.PI / 2.5;
      });
      this._npcT = this.t;
      this._npcs = out;
      return out;
    },
    spots() {
      this.theme3();
      const pro = this.theme().id === 'pro';
      const list = SPOTS.map((s) => Object.assign({ label: s.act === 'PROFILE' && pro ? 'ABRIR GUARDA-ROUPA (PERFIL)' : ACTL[s.act] }, s));
      const m = World.map;
      Object.keys(m.face).forEach((k) => {
        const f = m.face[k];
        Object.keys(f).forEach((dir) => {
          if (!f[dir].startsWith('door:')) return;
          const x = Number(k) % MW;
          const y = Math.floor(Number(k) / MW);
          const off = { N: [0.5, -0.02], S: [0.5, 1.02], E: [1.02, 0.5], W: [-0.02, 0.5] }[dir];
          const lab = f[dir].slice(5);
          list.push({ x: x + off[0], y: y + off[1], locked: lab, label: `${lab} (TRANCADO)`, h: 1.3 });
        });
      });
      this.npcs().forEach((n) => {
        if (n.noTalk) return;
        // pedestre: autógrafo, selfie ou só cumprimentar (js/hub3d_cidade.js)
        if (n.ped) {
          const sp = CITY() && CITY().spotOf(n, this);
          if (sp) list.push(sp);
          return;
        }
        list.push({ x: n.x, y: n.y, npc: n.id, label: n.id === 'anri' ? 'FALAR COM A ANRI (LOJA)' : `CONVERSAR COM ${n.id.toUpperCase()}`, h: 1.12 + (n.z || 0) });
      });
      // na cidade: lanchonete, metrô, desafio da quadra... (js/hub3d_cidade.js)
      if (this.cityOn() && CITY() && CITY().spots && CITY().inCity(this.area)) CITY().spots(list, this);
      return list;
    },
    // o que está na sua frente e perto
    nearSpot() {
      if (this._nearT === this.t) return this._near;
      let best = null;
      let bs = 1e9;
      this.spots().forEach((s) => {
        const dx = s.x - this.px;
        const dy = s.y - this.py;
        const d = Math.hypot(dx, dy);
        if (d > (s.npc ? 1.5 : 1.35)) return;
        let da = Math.atan2(dy, dx) - this.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 1.0 && d > 0.5) return;
        const score = d + Math.abs(da) * 0.7;
        if (score < bs) {
          bs = score;
          best = s;
        }
      });
      this._nearT = this.t;
      this._near = best;
      return best;
    },
    blocked3(x, y) {
      const r = 0.2;
      const Wd = World;
      if (Wd.isSolid(Math.floor(x - r), Math.floor(y - r)) || Wd.isSolid(Math.floor(x + r), Math.floor(y - r)) || Wd.isSolid(Math.floor(x - r), Math.floor(y + r)) || Wd.isSolid(Math.floor(x + r), Math.floor(y + r))) return true;
      for (let yy = Math.floor(y - 1); yy <= Math.floor(y + 1); yy++) for (let xx = Math.floor(x - 1); xx <= Math.floor(x + 1); xx++) {
        const l = xx >= 0 && yy >= 0 && xx < MW && yy < MH ? Wd.bcell[yy * MW + xx] : null;
        if (!l) continue;
        for (let j = 0; j < l.length; j++) {
          const b = Wd.boxes[l[j]];
          if (!b.solid) continue;
          if (x + r > b.x0 && x - r < b.x1 && y + r > b.y0 && y - r < b.y1) return true;
        }
      }
      if (Wd.sprites.some((p) => p.r > 0 && Math.hypot(p.x - x, p.y - y) < p.r + r)) return true;
      return this.npcs().some((n) => !n.ghostSolid && Math.hypot(n.x - x, n.y - y) < 0.4);
    },
    interact() {
      if (!this.canAct()) return;
      const s = this.nearSpot();
      if (!s) return;
      if (s.locked) {
        window.App.notify?.(`🔒 ${s.locked}: trancado. É o quarto de outro jogador.`, '#94a3b8');
        window.SFX?.click?.();
        return;
      }
      // fã na rua: autógrafo / selfie (js/hub3d_cidade.js)
      if (s.ped) return CITY() && CITY().interact(this, s);
      if (s.city) return CITY() && CITY().act(this, s);
      // a câmera vai até o que você usou quando a janela abre
      const FT = { LOJA: 'LOJA DA ANRI', ARMAS: 'ROLETA DAS ARMAS', FLUXO: 'TUBO DO FLUXO', ESTATISTICAS: 'SEU PC', PROFILE: 'SEU ARMÁRIO', HISTORIA: 'TELÃO DO EGO', TREINO: 'HORA DE TREINAR', EQUIPE: 'A ESCALAÇÃO', CONQUISTAS: 'SEUS TROFÉUS', OBJECTIVES: 'O MURAL' };
      this.focus = { x: s.x, y: s.y, h: s.npc ? 1.0 : s.h || 1.0, label: s.npc ? (s.npc === 'anri' ? 'LOJA DA ANRI' : s.npc.toUpperCase()) : FT[s.act] || s.label, area: this.area };
      this._focusT = this.t;
      if (s.npc) {
        if (s.npc === 'anri') return this.openPanel('LOJA');
        if (this.bubble && this.bubble.npc === s.npc) return this.openPanel('RELACIONAMENTOS');
        const pool = Hub.LINES[s.npc] || Hub.LINES._;
        this.bubble = { npc: s.npc, text: pool[Math.floor(Math.random() * pool.length)], until: this.t + 260 };
        window.SFX?.blip?.(880);
        return;
      }
      if (s.act === 'SLEEP') {
        window.App.saveState?.();
        window.App.notify?.('💾 Você descansou um pouco. Jogo salvo.', '#22d3ee');
        return;
      }
      const a = Hub.ACT[s.act];
      if (a?.tab) this.openPanel(a.tab);
    },
    step() {
      this.t++;
      this.theme3();
      if (this.bubble && this.t > this.bubble.until) this.bubble = null;
      if (!this.canAct()) {
        this.moving = false;
        return;
      }
      const k = this.keys;
      const turn = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      this.ang += turn * 0.05 + (this.dragTurn || 0) + (this.touchTurn || 0) * 0.036;
      this.dragTurn = 0;
      let fwd = (k.up ? 1 : 0) - (k.down ? 1 : 0) + (this.touchFwd || 0);
      fwd = Math.max(-1, Math.min(1, fwd));
      this.moving = Math.abs(fwd) > 0.15;
      if (this.moving) {
        const spd = (k.run ? 0.082 : 0.05) * (fwd < 0 ? 0.65 : 1) * Math.sign(fwd) * Math.min(1, Math.abs(fwd) * 1.3);
        const vx = Math.cos(this.ang) * spd;
        const vy = Math.sin(this.ang) * spd;
        if (!this.blocked3(this.px + vx, this.py)) this.px += vx;
        if (!this.blocked3(this.px, this.py + vy)) this.py += vy;
      }
      // a câmera vira com você, com um pouquinho de atraso
      let da = this.ang - this.camA;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      this.camA += da * 0.2;
      const a = World.areaAt(this.px, this.py);
      if (a && a !== this.area) {
        this.area = a;
        this.room = a;
        const nm = this.areaName(a);
        this.hud.querySelector('.hub-room').textContent = nm;
        this.showTitleCard(nm, this.theme());
        // (saindo para a rua: o aviso de quanto a cidade te conhece)
        if (this.cityOn() && CITY()) CITY().onArea(this, a);
      }
    },
    draw() {
      const t0 = performance.now();
      const th = this.theme3();
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      if (this.cv.width !== vw || this.cv.height !== vh) {
        this.cv.width = vw;
        this.cv.height = vh;
      }
      // tamanho do pixel: começa com ~270 linhas no PC (~200 no celular); a qualidade
      // automática aumenta o pixel se o quadro demorar e diminui se sobrar tempo
      const touch = document.documentElement.classList.contains('is-touch');
      const kMin = Math.max(1, Math.round(vh / (touch ? 230 : 300)));
      if (!this.k3 || this._kvh !== vh) {
        this._kvh = vh;
        this.k3 = Math.max(kMin, Math.round(vh / (touch ? 200 : 270)));
      }
      this.q3 = Math.ceil(vh / this.k3);
      setRes(vw, vh, this.k3);
      if (this.area === 'saguao' && this.t % 6 === 0) World.screenTex = makeScreen(th, this.t);
      if (this.area === 'armas' || this.area === 'subsolo') {
        if (this.t % 2 === 0) World.wheel.f.S = World.wheel.f.N = wheelTex(this.t);
        if (this.t % 3 === 0) {
          const tt = tubeTex(this.t);
          ['N', 'S', 'E', 'W'].forEach((d) => (World.tube.f[d] = tt));
        }
      }
      const App = window.App;
      const p = App.state.profile;
      const me = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number };
      // câmera atrás de você (chega mais perto se tiver parede atrás)
      const cdx = Math.cos(this.camA);
      const cdy = Math.sin(this.camA);
      let back = CAM_BACK;
      for (let d = 0.15; d <= CAM_BACK; d += 0.05) {
        const x = this.px - cdx * d;
        const y = this.py - cdy * d;
        let hit = World.isSolid(Math.floor(x), Math.floor(y));
        if (!hit) {
          const l = World.bcell[Math.floor(y) * MW + Math.floor(x)];
          if (l) hit = l.some((id) => {
            const b = World.boxes[id];
            return b.z1 > CZ - 0.05 && b.z0 < CZ + 0.05 && x > b.x0 - 0.1 && x < b.x1 + 0.1 && y > b.y0 - 0.1 && y < b.y1 + 0.1;
          });
        }
        if (hit) {
          back = Math.max(0.35, d - 0.22);
          break;
        }
      }
      this._back = this._back === undefined || back < this._back ? back : this._back + (back - this._back) * 0.1;
      // perto de você (parede atrás) a câmera sobe e olha mais para baixo, para não tapar a vista
      const close = 1 - Math.min(1, this._back / 2.4);
      CZ = CAM_Z + close * 0.14;
      V.hz = Math.round(V.H * (HZK - close * 0.07));
      const cam = { x: this.px - cdx * this._back, y: this.py - cdy * this._back, a: this.camA };
      // quem aparece: enfeites, companheiros e você
      const sprites = [];
      World.sprites.forEach((s) => {
        if (!s.tex) s.tex = propTex(s.key, s.factory, th);
        // (árvore da cidade colada na câmera: meio transparente)
        const de = s.k >= 2 ? Math.hypot(s.x - cam.x, s.y - cam.y) : 9;
        sprites.push(de < 1.8 ? Object.assign({}, s, { ghost: Math.max(0.12, (de - 0.5) / 1.3) }) : s);
      });
      const npcs = this.npcs();
      const rX = -Math.sin(cam.a);
      const rY = Math.cos(cam.a);
      npcs.forEach((n, i) => {
        // (a bola da quadra da cidade vem pronta: n.tex)
        if (n.tex) {
          sprites.push({ x: n.x, y: n.y, z: n.z, k: n.k || 1, shadow: n.shadow ?? 0.1, tex: n.tex });
          return;
        }
        let rel = Math.atan2(cam.y - n.y, cam.x - n.x) - n.ang;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const view = n.view || (Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side');
        const left = n.left !== undefined ? !!n.left : Math.cos(n.ang) * rX + Math.sin(n.ang) * rY < 0;
        const frame = n.frame !== undefined ? n.frame : n.anim === 'run' ? Math.floor(this.t * 0.5) : Math.floor(this.t / 4) * 4;
        // (pedestre colado na câmera: meio transparente)
        const de = n.ped ? Math.hypot(n.x - cam.x, n.y - cam.y) : 9;
        sprites.push({ x: n.x, y: n.y, z: n.z, npc: n, k: n.k || 0.9, foot: 6 / 72, shadow: n.shadow ?? 0.24, ghost: de < 1.3 ? Math.max(0.12, (de - 0.35) / 0.95) : 0, tex: charTex(n.slot || i + 1, n.cd, Object.assign({ view, left, animState: n.anim, frame }, n.opts || {})) });
      });
      const frame = this.moving ? Math.floor(this.t * (this.keys.run ? 0.9 : 0.6)) : Math.floor(this.t / 4) * 4;
      sprites.push({ x: this.px, y: this.py, me: true, k: 0.9, foot: 6 / 72, shadow: 0.26, ghost: this._back < 1.25 ? Math.max(0.35, Math.min(0.85, (this._back - 0.35) / 0.9 * 0.5 + 0.35)) : 0, tex: charTex(0, me, { view: 'back', animState: this.moving ? 'run' : 'idle', frame, accessories: App.state.equippedAccessories || [] }) });
      render(cam, sprites);
      // setinha amarela em cima do que dá para usar
      const g = V.g;
      const spot = this.canAct() ? this.nearSpot() : null;
      if (spot) {
        const sc = project(cam, spot.x, spot.y, spot.h || 1.1);
        if (sc) {
          const bob = Math.round(Math.abs(Math.sin(this.t * 0.09)) * 3);
          const x = Math.round(sc.x);
          const y = Math.round(sc.y) - bob - 6;
          [[9, 0], [7, 1], [5, 2], [3, 3], [1, 4]].forEach(([w, k2]) => R(g, x - Math.ceil(w / 2) - 1, y + k2 - 1, w + 2, 3, '#0f172a'));
          [[9, 0], [7, 1], [5, 2], [3, 3], [1, 4]].forEach(([w, k2]) => R(g, x - Math.ceil(w / 2), y + k2, w, 1, k2 ? '#facc15' : '#fef08a'));
        }
      }
      // na tela: imagem pequena ampliada + brilho + vinheta
      const o = this.cv.getContext('2d');
      o.imageSmoothingEnabled = false;
      o.drawImage(V.cv, 0, 0, V.W * V.k, V.H * V.k);
      if (V.H >= 140) bloom(o, V.W * V.k, V.H * V.k);
      if (!this._vig || this._vig.w !== vw || this._vig.h !== vh) {
        const c = canvas(vw, vh);
        const vg = c.getContext('2d');
        const gr = vg.createRadialGradient(vw / 2, vh * 0.48, vh * 0.42, vw / 2, vh * 0.48, Math.hypot(vw, vh) * 0.62);
        gr.addColorStop(0, 'rgba(2,6,23,0)');
        gr.addColorStop(1, 'rgba(2,6,23,0.6)');
        vg.fillStyle = gr;
        vg.fillRect(0, 0, vw, vh);
        this._vig = { w: vw, h: vh, c };
      }
      o.drawImage(this._vig.c, 0, 0);
      this.cam3 = cam;
      this.drawHud(null, V.k);
      this.hud3(cam, npcs);
      // qualidade automática: se o quadro demora, pixels maiores (menos pixels)
      const ms = performance.now() - t0;
      this._ms = this._ms === undefined ? ms : this._ms * 0.95 + ms * 0.05;
      if (this.t - (this._qT || 0) > 90) {
        if (this._ms > 12 && vh / (this.k3 + 1) >= 100) {
          this.k3++;
          this._qT = this.t;
          this._ms = undefined;
        } else if (this._ms < 6 && this.k3 > kMin) {
          this.k3--;
          this._qT = this.t;
          this._ms = undefined;
        }
      }
    },
    // ponto do mundo → px da tela (CSS); o motor WebGL troca esta função
    toScreen(cam, x, y, h) {
      const sc = project(cam, x, y, h);
      return sc ? { x: sc.x * V.k, y: sc.y * V.k } : null;
    },
    hud3(cam, npcs) {
      // janela aberta pelo mapa: o nome do lugar em letras grandes do lado do 3D
      if (!this._ft) {
        this._ft = document.createElement('div');
        this._ft.className = 'hub-focus-title';
        this._ft.innerHTML = '<span></span><b></b>';
        document.body.appendChild(this._ft);
      }
      const fo = this.panel && this.focus;
      const ftOn = !!fo;
      if (ftOn) {
        const nm = this.areaName(fo.area || this.area);
        const sub = String(fo.label || '').replace(/\s*\(.*\)\s*$/, '');
        if (this._ft.firstChild.textContent !== nm) this._ft.firstChild.textContent = nm;
        if (this._ft.lastChild.textContent !== sub) this._ft.lastChild.textContent = sub;
      }
      if (this._ft.classList.contains('on') !== ftOn) this._ft.classList.toggle('on', ftOn);
      const bb = this.hud.querySelector('.hub-bubble');
      if (this.bubble) {
        const n = npcs.find((x) => x.id === this.bubble.npc);
        const sc = n && this.toScreen(cam, n.x, n.y, 1.2 + (n.z || 0));
        if (sc) {
          // (fã da rua: o balão diz quem é e o que o E faz; companheiro: abrir a relação)
          const bu = this.bubble;
          const hint = bu.hint !== undefined ? bu.hint : 'E de novo: ver a relação';
          const html = `<b>${bu.who || bu.npc.toUpperCase()}</b>${bu.text}${hint ? `<small>${hint}</small>` : ''}`;
          if (bb.innerHTML !== html) bb.innerHTML = html;
          if (bb.classList.contains('fan') !== !!bu.fan) bb.classList.toggle('fan', !!bu.fan);
          bb.hidden = false;
          // (no celular a interface tem o zoom do TAMANHO DA TELA; o mapa não)
          if (this.t % 60 === 0 || !this._uk) this._uk = document.documentElement.classList.contains('is-touch') ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-k')) || 1 : 1;
          bb.style.left = `${Math.round(sc.x / this._uk)}px`;
          bb.style.top = `${Math.round(sc.y / this._uk) - 8}px`;
        } else bb.hidden = true;
      } else bb.hidden = true;
      if (this.t - (this._miniT || 0) >= 3 || !this._mini0) {
        this._miniT = this.t;
        this._mini0 = true;
        this.renderMini();
      }
      if (!this._hint3) {
        this._hint3 = true;
        const h = this.hud.querySelector('.hub-hint');
        if (h) h.innerHTML = '<kbd>W</kbd><kbd>S</kbd> andar <kbd>A</kbd><kbd>D</kbd> / mouse virar <kbd>SHIFT</kbd> correr <kbd>E</kbd> interagir <kbd>ESC</kbd> menu';
      }
    },
    // minimapa: a planta do andar, a sua posição e para onde você olha
    renderMini() {
      const el = this.hud.querySelector('.hub-map');
      if (!el) return;
      let cv = el.querySelector('canvas.hub-mini');
      const K = 3;
      const m = World.map;
      // (com a cidade a planta fica bem mais alta: as linhas dela entram embaixo do prédio e o
      // minimapa mostra uma janela de 46 linhas que acompanha você)
      const rows = m.rows;
      const VR = Math.min(rows, 46);
      if (!cv) {
        el.innerHTML = '<div class="hub-map-title">MAPA <span class="hub-map-area"></span></div>';
        cv = canvas(MW * K, VR * K);
        cv.className = 'hub-mini';
        el.appendChild(cv);
      }
      if (cv.height !== VR * K) {
        cv.height = VR * K;
        cv._rows = 0;
      }
      if (cv._rows !== VR) {
        cv._rows = VR;
        cv.style.cssText = `display:block;width:186px;height:${VR * 3}px;image-rendering:pixelated`;
      }
      const oy = rows > VR ? Math.max(0, Math.min((rows - VR) * K, Math.round(this.py * K - (VR * K) / 2))) : 0;
      const g = cv.getContext('2d');
      if (World.miniKey !== World.key || World.miniArea !== this.area) {
        World.miniKey = World.key;
        World.miniArea = this.area;
        let base = World.miniBase;
        if (!base || base.height !== rows * K) base = World.miniBase = canvas(MW * K, rows * K);
        const bg = base.getContext('2d');
        bg.clearRect(0, 0, base.width, base.height);
        const acc = this.theme().acc;
        const city = CITY() && m.city ? CITY().miniColor : null;
        for (let y = 0; y < rows; y++) for (let x = 0; x < MW; x++) {
          const a = m.area[y * MW + x];
          if (a < 0 || m.solid[y * MW + x]) continue;
          const id = AREA_IDS[a];
          // (na cidade: rua, calçada e quadra com a cor delas; a área onde você está, tingida)
          const cc = city && city(id, x, y);
          if (cc) {
            bg.fillStyle = cc;
            bg.fillRect(x * K, y * K, K, K);
            if (id !== this.area) continue;
            bg.globalAlpha = 0.18;
            bg.fillStyle = acc;
            bg.fillRect(x * K, y * K, K, K);
            bg.globalAlpha = 1;
            continue;
          }
          bg.globalAlpha = id === this.area ? 0.6 : 1;
          bg.fillStyle = id === this.area ? acc : id === 'campo' ? '#166534' : '#334155';
          bg.fillRect(x * K, y * K, K, K);
          bg.globalAlpha = 1;
        }
        // os pontos que importam na cidade (banca, telão, quadra, porta de casa)
        if (city && CITY().miniMarks) CITY().miniMarks(bg, K);
        bg.fillStyle = '#facc15';
        SPOTS.forEach((s) => bg.fillRect(Math.floor(s.x) * K + 1, Math.floor(s.y) * K + 1, 1, 1));
      }
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(World.miniBase, 0, -oy);
      // na rua: quem passa (os fãs que te reconheceram em rosa)
      if (m.city && CITY()) {
        g.save();
        g.translate(0, -oy);
        CITY().miniPeds(g, K, this);
        g.restore();
      }
      const px = this.px * K;
      const py = this.py * K - oy;
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.moveTo(px + Math.cos(this.ang) * 6, py + Math.sin(this.ang) * 6);
      g.lineTo(px + Math.cos(this.ang + 2.5) * 4, py + Math.sin(this.ang + 2.5) * 4);
      g.lineTo(px + Math.cos(this.ang - 2.5) * 4, py + Math.sin(this.ang - 2.5) * 4);
      g.closePath();
      g.fill();
      const lab = el.querySelector('.hub-map-area');
      const nm = `• ${this.areaName(this.area)}`;
      if (lab && lab.textContent !== nm) lab.textContent = nm;
    },
    renderMap() {}
  });

  // ponto do mundo (x, y, altura h) → tela (px da imagem pequena)
  function project(cam, x, y, h) {
    const dirX = Math.cos(cam.a);
    const dirY = Math.sin(cam.a);
    const dx = x - cam.x;
    const dy = y - cam.y;
    const depth = dx * dirX + dy * dirY;
    if (depth <= 0.2) return null;
    const lat = -dx * dirY + dy * dirX;
    return { x: V.W / 2 + (lat / depth) * V.F, y: V.hz + ((CZ - h) * V.F) / depth };
  }

  // arrastar para virar (mouse) / arrastar para andar e virar (toque); tocar = interagir
  let drag = null;
  let joy = null;
  const attach = () => {
    const cv = Hub.cv;
    if (!cv) return setTimeout(attach, 150);
    cv.addEventListener('pointerdown', (e) => {
      if (!Hub.live() || !Hub.canAct()) return;
      drag = { x: e.clientX, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId, touch: e.pointerType === 'touch' };
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {}
      // no toque: um joystick aparece embaixo do dedo
      if (drag.touch) {
        if (!joy) {
          joy = document.createElement('div');
          joy.className = 'hub-joy';
          joy.innerHTML = '<i></i>';
          document.body.appendChild(joy);
        }
        joy.style.left = `${e.clientX}px`;
        joy.style.top = `${e.clientY}px`;
        joy.firstChild.style.transform = '';
        joy.classList.add('on');
      }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 12) drag.moved = true;
      if (drag.touch) {
        // joystick: para cima/baixo anda, para o lado vira (segurando de lado, continua virando)
        const ox = e.clientX - drag.sx;
        const oy = e.clientY - drag.sy;
        Hub.touchFwd = Math.max(-1, Math.min(1, -oy / 50));
        Hub.touchTurn = Math.abs(ox) < 8 ? 0 : Math.max(-1, Math.min(1, ox / 55));
        const d = Math.hypot(ox, oy) || 1;
        const k = Math.min(1, 40 / d);
        if (joy) joy.firstChild.style.transform = `translate(${Math.round(ox * k)}px, ${Math.round(oy * k)}px)`;
      } else Hub.dragTurn = (Hub.dragTurn || 0) + dx * 0.006;
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) Hub.interact();
      drag = null;
      Hub.touchFwd = 0;
      Hub.touchTurn = 0;
      if (joy) joy.classList.remove('on');
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  };
  attach();
  // janela aberta pelo ☰ MENU (sem tocar em nada no mapa): a câmera fica onde está
  const openPanel0 = Hub.openPanel;
  Hub.openPanel = function (tab) {
    if (this._focusT !== this.t) this.focus = null;
    openPanel0.call(this, tab);
    fitPanel();
  };
  // janela estreita (tela média): o conteúdo da aba é desenhado na largura para a qual ele
  // foi feito (1260 px) e encolhido por igual, em vez de espremer as colunas
  const DESIGN_W = 1260;
  function fitPanel() {
    const ws = document.querySelector('.main-workspace');
    if (!ws) return;
    let z = 1;
    if (Hub.panel && !document.documentElement.classList.contains('is-touch')) {
      const cs = getComputedStyle(ws);
      const inner = ws.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      z = Math.max(0.6, Math.min(1, inner / DESIGN_W));
      if (z > 0.97) z = 1;
    }
    const v = String(Math.round(z * 1000) / 1000);
    if (ws.style.getPropertyValue('--panel-zoom') !== v) ws.style.setProperty('--panel-zoom', v);
  }
  window.addEventListener('resize', () => setTimeout(fitPanel, 50));
  setInterval(fitPanel, 700);
  // a janela das abas usa a cor da área/fase (--hub-acc) e o estilo de vidro do 3D
  document.documentElement.classList.add('hub-3d');
  setInterval(() => {
    const th = Hub._th;
    if (th && th.acc !== Hub._docAcc) {
      Hub._docAcc = th.acc;
      document.documentElement.style.setProperty('--hub-acc', th.acc);
    }
  }, 500);
  Hub.World3D = World;
  // o que o motor WebGL (js/hub3d_gl.js) usa daqui: o prédio, as texturas e as medidas
  Hub._3d = { World, AREAS, AREA_IDS, OPEN, REFL, SPOTS, C: { WALL_H, CAM_Z, CAM_BACK, MW, MH, BH, LM, FTX, CTX, SPX, TW, TH }, makeScreen, wheelTex, tubeTex, propTex, charTex, charCd, canvas, makeTex, KIT };
  Hub.V3D = V;
})();
