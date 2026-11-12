// ============================================================================
// O ESTÁDIO GIGANTE — Seleção (Sub-20 e convocação), Copa do Mundo e liga profissional
// Em volta do campo do prédio (área 'campo': x 45–61, y 6–23), só no 3D (WebGL2):
//   • três anéis de arquibancada (inferior, médio e superior) subindo e recuando, com os
//     cantos arredondados; a torcida em pixel art é desenhada pelo próprio shader (não
//     tem textura de gente): cada pessoa tem 6 x 14 px, camisa, pele, cabelo e cadeira;
//   • faixas de LED entre os anéis (texto do tema rolando), telões nos 4 cantos e os
//     bandeirões ondulando em cima da torcida atrás dos gols;
//   • a cobertura (anel do teto) com a fileira de refletores na beirada e as 4 torres de
//     luz em cima dela;
//   • luz de cinema: fachos de luz (fitas somando luz, viradas para a câmera), brilho e
//     risco dos refletores (flare), poeira dançando na luz, poça de luz no gramado e a
//     névoa clareando perto do teto (onde a luz espalha).
// A torcida é VIVA e barata: ola, braços para cima, pulos, bandeirinhas balançando e
// flash de celular saem de um relógio no shader. Nenhuma textura é refeita por quadro e
// tudo fica em 2 buffers fixos (2 chamadas de desenho: a parte sólida e a luz). De longe
// cada pessoa vira a cor dela por faixa (mais barato e sem serrilhar). Assim que o tema do
// estádio entra (ainda dentro do prédio) os programas começam a compilar em paralelo e a
// geometria é montada aos poucos, um pedaço por quadro: o campo não engasga ao chegar.
// Liga no js/hub3d_gl.js: HubEstadio.wants / draw (antes e depois dos bonecos) e replaces
// (se este arquivo falhar na placa de vídeo, volta a arquibancada simples de 4 degraus).
// As cenas de cinema filmam este mesmo estádio (menos as montadas na área vazia K.VOID e
// as de dentro do prédio). O som da torcida mora em js/torcida.js (HubEstadio.seen/excite).
// ============================================================================
(function () {
  const Hub = window.Hub;
  const G3 = Hub && Hub.GL3D;
  if (!Hub || !Hub._3d || !G3 || !G3.compile) return;
  const X = Hub._3d;
  const World = X.World;
  const WALL_H = X.C.WALL_H;
  const STAD = { japan: 1, worldcup: 1, pro: 1 };
  // o campo (área 'campo' do js/hub3d.js, carve 45..60 x 6..22) e o meio dele
  const R = { x0: 45, y0: 6, x1: 61, y1: 23 };
  const CX = (R.x0 + R.x1) / 2;
  const CY = (R.y0 + R.y1) / 2;

  // ---------------------------------------------------------------- o perfil
  // d = distância da borda do campo, z = altura (ladrilhos; 1 pessoa ≈ 0,9). Cada anel:
  // n fileiras, cada uma recua s e sobe r. lit = luz na 1ª e na última fileira.
  const RINGS = [
    { d0: 0.15, z0: WALL_H, n: 10, s: 0.46, r: 0.36, lit0: 1.0, lit1: 0.8 },
    { d0: 4.25, z0: 6.9, n: 9, s: 0.5, r: 0.42, lit0: 0.86, lit1: 0.62 },
    { d0: 8.45, z0: 12.0, n: 12, s: 0.55, r: 0.52, lit0: 0.74, lit1: 0.4 }
  ];
  RINGS.forEach((g) => {
    g.d1 = g.d0 + g.n * g.s;
    g.z1 = g.z0 + g.n * g.r;
  });
  // varandas entre os anéis: a frente (faixa de LED) em d, de z0 a z1; embaixo dela o
  // corredor escuro com luzinhas, até o fundo do anel de baixo
  const FASCIA = [
    { d: 4.0, z0: 6.0, z1: 6.9, strip: 0 },
    { d: 8.3, z0: 11.2, z1: 12.0, strip: 1 }
  ];
  // a cobertura: beirada de dentro (com os refletores) em d0, fundo em d1
  const ROOF = { d0: 10.5, d1: 16.0, z0: 19.9, z1: 20.7 };
  const TOWER = { d: 13.25, z0: ROOF.z1, z1: 26.4, lamp: 27.3 };
  const NA = 5; // pedaços de cada canto arredondado
  const BEAM_END = 0.72; // (até onde vai a fita do facho: 0 = refletor, 1 = gramado)

  // distância (fora) até o retângulo do campo
  const dOut = (x, y) => Math.hypot(Math.max(R.x0 - x, 0, x - R.x1), Math.max(R.y0 - y, 0, y - R.y1));
  // o ponto (x, y, altura h) fica dentro da arquibancada/do teto? (para os testes de câmera)
  function inside(x, y, h) {
    const d = dOut(x, y);
    if (d <= 0.02 || d > ROOF.d1 + 0.3) return false;
    if (d >= ROOF.d0 - 0.1 && h >= ROOF.z0 - 0.15 && h <= ROOF.z1 + 0.15) return true;
    if (h > ROOF.z1) return false;
    // (dentro do prédio, embaixo do teto, não é arquibancada: o estádio fica em cima dele)
    const a = World.map && World.areaAt(x, y);
    if (a && a !== 'campo' && h < WALL_H) return false;
    let z = WALL_H;
    RINGS.forEach((g) => {
      if (d >= g.d0 - 0.01) z = Math.max(z, g.z0 + Math.min(g.n, Math.floor((d - g.d0) / g.s) + 1) * g.r);
    });
    FASCIA.forEach((f) => {
      if (d >= f.d - 0.01) z = Math.max(z, f.z1);
    });
    if (d >= RINGS[2].d1 - 0.01) z = ROOF.z1;
    return h < z + 0.15;
  }

  // ---------------------------------------------------------------- a geometria
  // contorno a d da borda do campo: retângulo com os cantos arredondados (raio d)
  const LOOPS = new Map();
  function loopAt(d) {
    const k = d.toFixed(3);
    if (LOOPS.has(k)) return LOOPS.get(k);
    const pts = [];
    [[R.x1, R.y0, -Math.PI / 2], [R.x1, R.y1, 0], [R.x0, R.y1, Math.PI / 2], [R.x0, R.y0, Math.PI]].forEach(([cx, cy, a0]) => {
      for (let j = 0; j <= NA; j++) {
        const a = a0 + (j / NA) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
      }
    });
    const len = [0];
    for (let i = 1; i <= pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i % pts.length];
      len.push(len[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
    }
    const L = { pts, len };
    LOOPS.set(k, L);
    return L;
  }

  // Vértice da parte sólida: posição (x, altura, y), uv, k = [tipo, fileira/variação, luz,
  // extra] e a normal. Tipos: 0 = fileira da torcida (de frente), 1 = piso da fileira (as
  // cabeças vistas de cima), 2 = concreto (0 liso, 1 corredor com luzinhas, 2 na sombra),
  // 3 = faixa de LED, 4 = teto (0 embaixo, 1 em cima), 5 = beirada com os refletores,
  // 6 = telão, 7 = bandeirão, 8 = torre (treliça), 9 = painel de refletores da torre
  // (gerador: devolve o controle entre os pedaços, para montar aos poucos, um por quadro)
  function* solidGeometryGen() {
    const V = [];
    const vert = (p, u, v, k, n) => V.push(p[0], p[1], p[2], u, v, k[0], k[1], k[2], k[3], n[0], n[1], n[2]);
    // a, b em cima (v = va); c, d embaixo (v = vb)
    const quad = (a, b, c, d, u0, u1, va, vb, k, n) => {
      vert(a, u0, va, k, n);
      vert(b, u1, va, k, n);
      vert(c, u1, vb, k, n);
      vert(a, u0, va, k, n);
      vert(c, u1, vb, k, n);
      vert(d, u0, vb, k, n);
    };
    // parede em pé no contorno d, de z0 a z1, virada para o campo (v: 0 embaixo → vTop)
    const wall = (d, z0, z1, k, vTop = 1) => {
      const L = loopAt(d);
      const N = L.pts.length;
      for (let i = 0; i < N; i++) {
        const p = L.pts[i];
        const q = L.pts[(i + 1) % N];
        const len = L.len[i + 1] - L.len[i];
        if (len < 1e-4) continue;
        const n = [-(q[1] - p[1]) / len, 0, (q[0] - p[0]) / len];
        quad([p[0], z1, p[1]], [q[0], z1, q[1]], [q[0], z0, q[1]], [p[0], z0, p[1]], L.len[i], L.len[i + 1], vTop, 0, k, n);
      }
    };
    // faixa deitada entre os contornos dA (frente) e dB (fundo), na altura zA → zB
    // (u pelo contorno de trás; v: vA na frente → vB no fundo)
    const band = (dA, dB, zA, zB, k, ny, vA = 0, vB = 1) => {
      const A = loopAt(dA);
      const B = loopAt(dB);
      const N = A.pts.length;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        if (B.len[i + 1] - B.len[i] < 1e-4 && A.len[i + 1] - A.len[i] < 1e-4) continue;
        quad([A.pts[i][0], zA, A.pts[i][1]], [A.pts[j][0], zA, A.pts[j][1]], [B.pts[j][0], zB, B.pts[j][1]], [B.pts[i][0], zB, B.pts[i][1]], B.len[i], B.len[i + 1], vA, vB, k, [0, ny, 0]);
      }
    };
    // parapeito do muro do campo (o topo do muro de placas até a 1ª fileira)
    band(0, RINGS[0].d0, WALL_H, WALL_H, [2, 0, 0.9, 0], 1);
    // os três anéis: fileira (em pé, 14 px de altura) e o piso dela (as cabeças de quem
    // está nessa fileira, vistas de cima, no fundo do piso da frente)
    for (let gi = 0; gi < RINGS.length; gi++) {
      const g = RINGS[gi];
      for (let k = 0; k < g.n; k++) {
        const d = g.d0 + k * g.s;
        const z = g.z0 + k * g.r;
        const row = gi * 20 + k;
        const lit = g.lit0 + ((g.lit1 - g.lit0) * k) / Math.max(1, g.n - 1);
        wall(d, z, z + g.r, [0, row, lit, g.r], 14);
        // piso em cima desta fileira (até a próxima): as pessoas da PRÓXIMA fileira em pé
        // no fundo dele (v em px a partir do fundo: as cabeças ficam em v ≈ 0..4)
        const nT = (g.s / g.r) * 14;
        const nextRow = k + 1 < g.n ? row + 1 : -1;
        band(d, d + g.s, z + g.r, z + g.r, nextRow >= 0 ? [1, nextRow, lit * 1.05, g.r] : [2, 2, lit * 0.8, 0], 1, nextRow >= 0 ? nT : 0, nextRow >= 0 ? 0 : 1);
        if (k % 4 === 3) yield;
      }
      yield;
    }
    // varandas: frente com a faixa de LED, piso em cima, teto embaixo e o corredor no fundo
    FASCIA.forEach((f, i) => {
      const below = RINGS[i];
      const above = RINGS[i + 1];
      wall(f.d, f.z0, f.z1, [3, f.strip, 1, 0]);
      band(f.d, above.d0, f.z1, f.z1, [2, 0, 0.75, 0], 1);
      band(f.d, below.d1, f.z0, f.z0, [2, 2, 0.5, 0], -1);
      wall(below.d1, below.z1, f.z0, [2, 1, 0.5, 0]);
    });
    yield;
    // fundo do anel de cima até o teto e o teto (embaixo escuro com treliça, em cima a lona)
    const top = RINGS[2];
    wall(top.d1, top.z1, ROOF.z0, [2, 2, 0.4, 0]);
    band(ROOF.d0, ROOF.d1, ROOF.z0, ROOF.z0, [4, 0, 0.5, 0], -1);
    band(ROOF.d0, ROOF.d1 + 0.5, ROOF.z1, ROOF.z1 - 0.25, [4, 1, 0.9, 0], 1);
    wall(ROOF.d0, ROOF.z0, ROOF.z1, [5, 0, 1, 0]);
    wall(ROOF.d1 + 0.5, ROOF.z0, ROOF.z1 - 0.25, [2, 2, 0.4, 0]);

    yield;
    // caixa orientada: centro (x, y), meio-tamanhos (hw ao longo de t, hd ao longo de n),
    // de z0 a z1; front = tipo da face virada para n (o resto é concreto/metal)
    const obox = (cx, cy, nx, ny, hw, hd, z0, z1, front, sideK) => {
      const tx = -ny;
      const ty = nx;
      const P = (a, b, z) => [cx + tx * a + nx * b, z, cy + ty * a + ny * b];
      // frente (virada para o campo): u da esquerda para a direita vista do campo
      quad(P(-hw, -hd, z1), P(hw, -hd, z1), P(hw, -hd, z0), P(-hw, -hd, z0), 0, 1, 1, 0, front, [-nx, 0, -ny]);
      quad(P(-hw, hd, z1), P(hw, hd, z1), P(hw, hd, z0), P(-hw, hd, z0), 0, hw * 2, z1 - z0, 0, sideK, [nx, 0, ny]);
      quad(P(-hw, -hd, z1), P(-hw, hd, z1), P(-hw, hd, z0), P(-hw, -hd, z0), 0, hd * 2, z1 - z0, 0, sideK, [-tx, 0, -ty]);
      quad(P(hw, hd, z1), P(hw, -hd, z1), P(hw, -hd, z0), P(hw, hd, z0), 0, hd * 2, z1 - z0, 0, sideK, [tx, 0, ty]);
      quad(P(-hw, -hd, z1), P(hw, -hd, z1), P(hw, hd, z1), P(-hw, hd, z1), 0, hw * 2, 0, hd * 2, sideK, [0, 1, 0]);
      quad(P(-hw, hd, z0), P(hw, hd, z0), P(hw, -hd, z0), P(-hw, -hd, z0), 0, hw * 2, 0, hd * 2, sideK, [0, -1, 0]);
    };
    // telões nos 4 cantos, pendurados na varanda do anel do meio (n = para fora do campo)
    const corners = [[R.x1, R.y0, -Math.PI / 4], [R.x1, R.y1, Math.PI / 4], [R.x0, R.y1, (3 * Math.PI) / 4], [R.x0, R.y0, (-3 * Math.PI) / 4]];
    corners.forEach(([x, y, a], i) => {
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const d = FASCIA[0].d + 0.05;
      obox(x + nx * (d + 0.18), y + ny * (d + 0.18), nx, ny, 2.7, 0.18, 6.15, 9.2, [6, i, 1, 0], [2, 2, 0.5, 0]);
    });
    // torres de luz em cima do teto, nos cantos: o mastro (treliça) e o painel de refletores
    // virado para o meio do campo (inclinado para baixo)
    const towers = [];
    corners.forEach(([x, y, a]) => {
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const tx0 = x + nx * TOWER.d;
      const ty0 = y + ny * TOWER.d;
      obox(tx0, ty0, nx, ny, 0.24, 0.24, TOWER.z0, TOWER.z1 + 0.2, [8, 0, 0.7, 0], [8, 0, 0.7, 0]);
      // painel: placa inclinada (a face de baixo olha para o campo)
      const hw = 1.9;
      const hh = 1.0;
      const tilt = 0.62;
      const tx = -ny;
      const ty = nx;
      const c = [tx0 - nx * 0.35, TOWER.lamp, ty0 - ny * 0.35];
      const up = [nx * Math.sin(tilt), Math.cos(tilt), ny * Math.sin(tilt)]; // (o topo inclina para trás)
      const fn = [-nx * Math.cos(tilt), Math.sin(tilt) * -1, -ny * Math.cos(tilt)];
      const P = (a2, b2) => [c[0] + tx * a2 + up[0] * b2, c[1] + up[1] * b2, c[2] + ty * a2 + up[2] * b2];
      quad(P(hw, hh), P(-hw, hh), P(-hw, -hh), P(hw, -hh), 0, 1, 1, 0, [9, 0, 1, 0], fn);
      const B = (a2, b2) => {
        const p = P(a2, b2);
        return [p[0] + nx * 0.2, p[1] + 0.08, p[2] + ny * 0.2];
      };
      quad(B(-hw, hh), B(hw, hh), B(hw, -hh), B(-hw, -hh), 0, 1, 1, 0, [8, 0, 0.6, 0], [nx, 0, ny]);
      towers.push({ c, n: fn });
    });
    yield;
    // bandeirões em cima da torcida atrás dos gols (no plano das quinas do anel de baixo):
    // grade 16 x 6 que ondula no shader (a beirada de baixo quase presa)
    const g0 = RINGS[0];
    const m = g0.r / g0.s;
    const cs = 1 / Math.hypot(1, m);
    const flagAt = (side, idx) => {
      const W2 = 3.7;
      const dA = 0.4;
      const dB = 4.3;
      const NX = 16;
      const NY = 6;
      const P = (fx, fy) => {
        const d = dA + (dB - dA) * fy;
        // (u da esquerda para a direita visto do campo: no norte cresce com x, no sul ao contrário)
        const x = CX + (side < 0 ? 1 : -1) * (fx * 2 - 1) * W2;
        const y = side < 0 ? R.y0 - d : R.y1 + d;
        return [x, g0.z0 + g0.r + (d - g0.d0) * m + 0.2, y];
      };
      const n = [0, cs, (side < 0 ? 1 : -1) * m * cs];
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
        const u0 = i / NX;
        const u1 = (i + 1) / NX;
        const v0 = j / NY;
        const v1 = (j + 1) / NY;
        quad(P(u0, v1), P(u1, v1), P(u1, v0), P(u0, v0), u0, u1, v1, v0, [7, idx, 0.95, 1], n);
      }
    };
    flagAt(-1, 0);
    flagAt(1, 1);
    return { data: new Float32Array(V), towers };
  }

  // Luz (somando): fachos dos refletores, poças no gramado, poeira e o brilho dos refletores.
  // Vértice: a (3), b (3), c = [tipo, canto x, canto y, força]. Tipos: 0 = facho do teto,
  // 1 = facho da torre, 2 = brilho do refletor (b.x = tamanho, b.y = 1 risco horizontal),
  // 3 = grão de poeira (b = fase, velocidade), 4 = poça de luz no chão (b.x = raio)
  function fxGeometry(towers) {
    const V = [];
    const C4 = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    // (nos fachos o canto y vira "ao longo": 0 no refletor → BEAM_END, onde a fita acaba)
    const item = (a, b, kind, k) => C4.forEach(([x, y]) => V.push(a[0], a[1], a[2], b[0], b[1], b[2], kind, x, kind < 1.5 ? ((y + 1) / 2) * BEAM_END : y, k));
    const beams = [];
    // fachos: das 4 torres e 1 do meio de cada lado do teto, mirando o gramado. A fita
    // acaba antes do chão (a parte mais larga, perto do chão, era a que mais custava e
    // quase não aparecia): o facho some na névoa no meio do caminho
    towers.forEach((t, i) => {
      const tg = [[56.5, 10], [56.5, 19], [49.5, 19], [49.5, 10]][i];
      beams.push([t.c, [tg[0], 0, tg[1]], 1, 0.75]);
    });
    const rz = (ROOF.z0 + ROOF.z1) / 2;
    [
      [[53, rz, R.y0 - ROOF.d0 + 0.3], [53, 0, 12.5]],
      [[53, rz, R.y1 + ROOF.d0 - 0.3], [53, 0, 16.5]],
      [[R.x0 - ROOF.d0 + 0.3, rz, CY], [51, 0, CY]],
      [[R.x1 + ROOF.d0 - 0.3, rz, CY], [55, 0, CY]]
    ].forEach(([a, b]) => beams.push([a, b, 0, 0.55]));
    beams.forEach(([a, b, kind, k]) => item(a, b, kind, k));
    // poeira: grãos espalhados na parte de baixo dos fachos (onde a câmera do mapa vê)
    let s = 7;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < 110; i++) {
      const bm = beams[Math.floor(rnd() * beams.length)];
      const al = 0.45 + rnd() * 0.4;
      const a = bm[0];
      const b = bm[1];
      const p = [a[0] + (b[0] - a[0]) * al, a[1] + (b[1] - a[1]) * al, a[2] + (b[2] - a[2]) * al];
      const w = (bm[2] ? 4.4 : 3.0) * al * 0.4;
      p[0] += (rnd() - 0.5) * w;
      p[2] += (rnd() - 0.5) * w;
      p[1] = Math.max(0.5, p[1]);
      item(p, [rnd() * 6.28, 0.6 + rnd() * 0.8, 0], 3, 0.3 + rnd() * 0.35);
    }
    const nBeams = V.length / 10;
    // poças de luz no gramado embaixo dos fachos das torres (e o brilho, junto: estes
    // escrevem também no brilho/bloom)
    beams.slice(0, 4).forEach(([, b]) => item([b[0], 0.03, b[2]], [3.0, 0.75, 0], 4, 0.06));
    // brilho dos refletores do teto (1 a cada 3 da fileira) e dos painéis das torres
    const L = loopAt(ROOF.d0 - 0.15);
    const tot = L.len[L.len.length - 1];
    const step = 4.2;
    for (let u = step / 2; u < tot; u += step) {
      let i = 0;
      while (i < L.pts.length - 1 && L.len[i + 1] < u) i++;
      const p = L.pts[i];
      const q = L.pts[(i + 1) % L.pts.length];
      const f = (u - L.len[i]) / Math.max(1e-4, L.len[i + 1] - L.len[i]);
      const c = [p[0] + (q[0] - p[0]) * f, rz, p[1] + (q[1] - p[1]) * f];
      item(c, [0.55, 0, 0], 2, 0.75);
    }
    towers.forEach((t) => {
      item(t.c, [1.5, 0, 0], 2, 1.0);
      item(t.c, [1.5, 1, 0], 2, 0.55);
    });
    const nRoof = V.length / 10;
    // as 4 torrinhas do próprio campo (só no mapa: as cenas desenham o flare delas em 2D)
    [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]].forEach(([x, y]) => {
      item([x, 3.33, y], [0.42, 0, 0], 2, 0.8);
      item([x, 3.33, y], [0.42, 1, 0], 2, 0.45);
    });
    return { data: new Float32Array(V), nBeams, nRoof, n: V.length / 10 };
  }

  // ---------------------------------------------------------------- shaders
  const OUT = 'layout(location=0) out vec4 oCol;\nlayout(location=1) out vec4 oGlow;\n';
  const VS_SOLID = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
layout(location=2) in vec4 aK;
layout(location=3) in vec3 aN;
uniform mat4 uVP; uniform float uT;
out vec3 vPos; out vec2 vUv; flat out vec4 vK; out vec3 vN; out float vSh;
void main() {
  vec3 p = aPos;
  float sh = 1.0;
  if (aK.x > 6.5 && aK.x < 7.5) {
    // bandeirão: ondas passando (a torcida embaixo levanta o pano)
    float ph = aUv.x * 9.0 - uT * 2.4 + aUv.y * 2.5;
    float w = (sin(ph) * 0.1 + sin(aUv.x * 4.0 + uT * 1.6) * 0.05) * aK.w * (0.3 + 0.7 * aUv.y);
    p += aN * w;
    sh = 1.0 + cos(ph) * 0.3 * aK.w;
  }
  vPos = p; vUv = aUv; vK = aK; vN = aN; vSh = sh;
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS_SOLID = `#version 300 es
precision highp float;
in vec3 vPos; in vec2 vUv; flat in vec4 vK; in vec3 vN; in float vSh;
uniform vec3 uCam; uniform vec3 uFog; uniform float uFogK; uniform vec3 uHaze;
uniform float uT; uniform float uHype; uniform float uWave; uniform float uWaveP;
uniform vec3 uPal[8]; uniform vec3 uSkin[4]; uniform vec3 uSeat; uniform vec3 uAvg; uniform vec3 uBody;
uniform vec3 uAmb; uniform vec3 uKey; uniform vec3 uLamp; uniform vec3 uConc;
uniform vec3 uFlagA; uniform vec3 uFlagB;
uniform sampler2D uLed; uniform sampler2D uScr; uniform sampler2D uFlag; uniform float uScrF;
${OUT}
float hsh(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 hairOf(float h, vec3 shirt) { return h < 0.55 ? vec3(0.07, 0.06, 0.06) : (h < 0.8 ? vec3(0.3, 0.18, 0.09) : (h < 0.92 ? vec3(0.66, 0.5, 0.24) : shirt)); }
// uma pessoa (6 x 14 px): h = o sorteio dela (os outros saem dele), (cx, cy) = pixel dentro
// dela. lod = a cor dela vista de longe, por faixa (encosto, corpo, fundo): de longe
// continuam fileiras de gente, não quadradinhos
vec3 person(float h, float i, float row, float cx, float cy, float hy, float wv, out float em, out vec3 lod, out float fl) {
  em = 0.0;
  float h2 = fract(h * 43.17 + 0.31);
  float h3 = fract(h * 91.73 + 0.67);
  vec3 shirt = uPal[int(h * 7.999)];
  vec3 skin = uSkin[int(h2 * 3.999)];
  vec3 bg = uSeat * 0.38;
  bool empty = h2 > 0.955;
  lod = cy < 3.5 ? uSeat * 1.08 : (cy < 10.5 ? mix(shirt, bg, 0.33) + skin * 0.07 : bg);
  // flash do celular (uns poucos de cada vez, piscando)
  fl = empty ? 0.0 : step(0.9925 - 0.012 * hy, hsh(vec2(i * 1.7 + row * 9.1, floor(uT * 2.5 + h * 11.0))));
  vec3 c = cy < 4.0 ? (cy > 2.5 ? uSeat * 1.3 : uSeat) : bg;
  if (empty) {
    if (cy < 7.0) c = cy > 5.5 ? uSeat * 1.3 : uSeat;
    lod = cy < 6.5 ? uSeat * 1.08 : bg;
    return c;
  }
  // pose: braço para cima de vez em quando (mais com a torcida animada), pulando, sentado
  float arms = step(fract(h3 * 13.1 + uT * (0.08 + 0.15 * h2)), 0.05 + 0.5 * hy);
  arms = max(arms, step(0.3, wv));
  float jump = step(0.5, hy) * step(0.5, fract(uT * 1.8 + h * 7.0)) * step(0.35, h3);
  jump = max(jump, floor(wv * 2.0 + 0.35));
  float sit = step(hy, 0.3) * step(0.5, h) * (1.0 - arms);
  float py = cy - (jump - 2.0 * sit);
  // tronco (camisa, o lado da direita na sombra)
  if (cx > 0.5 && cx < 4.5 && py > 1.5 && py < 7.5) c = cx > 3.5 ? shirt * 0.7 : (py > 6.5 ? shirt * 1.12 : shirt);
  // cabeça e cabelo
  if (cx > 1.5 && cx < 3.5) {
    if (py > 7.5 && py < 9.5) c = cx > 2.5 ? skin * 0.82 : skin;
    else if (py > 9.5 && py < 10.5) c = hairOf(h3, shirt);
  }
  // braços para cima (nos vãos) com a mão no alto; parte segura o cachecol esticado
  if (arms > 0.5) {
    if ((cx < 0.5 || cx > 4.5) && py > 6.5 && py < 11.5) c = py > 10.5 ? skin : shirt;
    if (h2 < 0.28 && py > 11.5 && py < 12.5) c = mod(cx + i, 2.0) < 1.0 ? uFlagA : uFlagB;
  }
  if (fl > 0.5 && cx > 3.5 && cx < 4.5 && py > 9.5 && py < 10.5) { c = vec3(1.0); em = 1.6; }
  return c;
}
void main() {
  vec2 dUv = fwidth(vUv);
  // (derivadas fora dos ramos: a faixa de LED usa mipmap e o ramo muda de um triângulo para outro)
  vec2 gx = dFdx(vUv);
  vec2 gy = dFdy(vUv);
  float kind = vK.x;
  vec3 col;
  float em = 0.0;
  vec3 L = uAmb + uKey * vK.z;
  if (kind < 1.5) {
    // ---- torcida (0 = de frente, na fileira; 1 = cabeças vistas de cima, no piso)
    float pxs = vK.w / 14.0;
    float cxF = vUv.x / pxs;
    float i = floor(cxF / 6.0);
    float cx = floor(cxF - i * 6.0);
    float cy = floor(vUv.y);
    float row = vK.y;
    float fw = max(dUv.x / pxs, dUv.y);
    // escadas cortando a arquibancada (a cada 4 ladrilhos nas partes retas)
    float ax = vPos.x - ${CX.toFixed(2)};
    float az = vPos.z - ${CY.toFixed(2)};
    float sA = abs(ax) < ${((R.x1 - R.x0) / 2).toFixed(2)} ? ax : (abs(az) < ${((R.y1 - R.y0) / 2).toFixed(2)} ? az : 1.0);
    if (fract(sA / 4.0 + 0.5) < 0.075) {
      vec3 c = uConc * (kind < 0.5 ? 0.75 : 1.25);
      if (kind > 0.5 && cy < 0.5) c *= 0.7;
      col = c * L;
    } else {
      // a ola: uma onda que dá a volta no estádio (ângulo em volta do campo)
      float ang = atan(az, ax) / 6.2831853;
      float wv = uWave * smoothstep(0.06, 0.0, abs(fract(ang - uWaveP + 0.5) - 0.5));
      // a organizada (atrás dos gols, no anel de baixo) está sempre pulando
      float ultra = (row < 20.0 && abs(ax) < 6.5 && abs(az) > ${((R.y1 - R.y0) / 2).toFixed(2)}) ? 1.0 : 0.0;
      float hy = max(uHype, ultra * 0.62);
      float h = hsh(vec2(i, row));
      vec3 lod;
      float fl = 0.0;
      vec3 c;
      if (fw > 1.8) {
        // longe (cada pixel da pessoa já é menor que 1 px da tela): só a cor dela por faixa,
        // sem desenhar a pessoa (o mesmo resultado da mistura abaixo, bem mais barato)
        vec3 shirt = uPal[int(h * 7.999)];
        float h2 = fract(h * 43.17 + 0.31);
        vec3 bg = uSeat * 0.38;
        if (kind > 0.5) lod = mix(shirt, uSeat * 0.3, 0.55);
        else if (h2 > 0.955) lod = cy < 6.5 ? uSeat * 1.08 : bg;
        else lod = cy < 3.5 ? uSeat * 1.08 : (cy < 10.5 ? mix(shirt, bg, 0.33) + uSkin[int(h2 * 3.999)] * 0.07 : bg);
        c = lod;
        if (kind < 0.5) fl = step(0.9925 - 0.012 * hy, hsh(vec2(i * 1.7 + row * 9.1, floor(uT * 2.5 + h * 11.0))));
      } else if (kind < 0.5) {
        c = person(h, i, row, cx, cy, hy, wv, em, lod, fl);
        // bandeirinha: quem segura tem o mastro no vão da direita e o pano por cima do vizinho
        float fq = 0.9 - 0.07 * hy;
        float hS = fract(h * 7.31 + 0.13);
        float hL = fract(hsh(vec2(i - 1.0, row)) * 7.31 + 0.13);
        if (hS > fq && cx > 4.5 && cy > 6.5) c = vec3(0.75, 0.75, 0.72);
        if (hL > fq) {
          float wob = floor(sin(uT * 5.0 + cx * 1.3 + i * 0.7) * 1.1 + 0.5);
          float fy = cy - 10.0 - wob;
          if (cx < 3.5 && fy > -0.5 && fy < 3.5) c = fy < 1.5 ? uFlagB : uFlagA;
        }
      } else {
        // de cima: no fundo do piso (v = 0..4 px) a cabeça e os ombros de quem está atrás
        vec3 shirt = uPal[int(h * 7.999)];
        c = uSeat * 0.3;
        lod = mix(shirt, c, 0.55);
        if (fract(h * 43.17 + 0.31) <= 0.955) {
          if (cx > 0.5 && cx < 4.5 && cy > 1.5 && cy < 4.5) c = cx > 3.5 ? shirt * 0.75 : shirt;
          if (cx > 1.5 && cx < 3.5 && cy < 2.5) c = hairOf(fract(h * 91.73 + 0.67), shirt);
        } else if (cy < 3.5) c = uSeat;
      }
      // longe: a pessoa vira a cor dela por faixa; mais longe, a faixa média da torcida;
      // bem longe, a cor média (sem isso os pixels piscam/serrilham ao mexer a câmera)
      float m1 = smoothstep(0.9, 1.8, fw);
      c = mix(c, lod, m1);
      vec3 band = kind > 0.5 ? uAvg : (cy < 3.5 ? uSeat * 1.08 : (cy < 10.5 ? uBody : uSeat * 0.38));
      c = mix(c, mix(lod, band, 0.55), smoothstep(2.6, 5.0, fw));
      c = mix(c, uAvg, smoothstep(5.0, 10.0, fw));
      // (de longe a ola vira uma faixa mais clara passando: gente de pé com os braços para cima)
      c *= 1.0 + 0.45 * wv * m1;
      em = max(em * (1.0 - m1), fl * m1 * min(1.0, 1.4 / fw) * 1.4);
      col = em > 0.0 && m1 < 0.5 ? c : c * L;
      if (em > 0.0 && m1 >= 0.5) col += vec3(em * 0.5);
    }
  } else if (kind < 2.5) {
    // ---- concreto
    vec3 c = uConc;
    float ju = step(fract(vUv.x / 2.4), 0.03) + step(fract(vUv.y * 2.0), 0.06);
    c *= 1.0 - 0.25 * min(ju, 1.0);
    if (vK.y > 1.5) c *= 0.5;
    if (vK.y > 0.5 && vK.y < 1.5) {
      // corredor embaixo da varanda: escuro, com luzinhas
      float lx = fract(vUv.x / 1.6);
      c *= 0.45;
      if (lx > 0.44 && lx < 0.56 && vUv.y > 0.45 && vUv.y < 0.72) { c = uLamp * 0.8; em = 1.0; }
    }
    col = em > 0.0 ? c : c * (uAmb * 1.15 + uKey * vK.z * 0.55);
  } else if (kind < 3.5) {
    // ---- faixa de LED: texto do tema rolando (a de cima vai para o outro lado)
    float dir = vK.y > 0.5 ? -1.0 : 1.0;
    float yy = clamp((vUv.y - 0.12) / 0.76, 0.0, 1.0);
    vec2 tu = vec2(vUv.x / 46.0 - uT * 0.045 * dir, (vK.y + 1.0 - yy) * 0.5);
    vec2 gs = vec2(1.0 / 46.0, 0.5 / 0.76);
    vec3 s = textureGrad(uLed, tu, gx * gs, gy * gs).rgb;
    vec2 px = vec2(tu.x * 1024.0, yy * 14.0);
    s *= 0.62 + 0.38 * step(0.22, fract(px.x)) * step(0.22, fract(px.y));
    if (vUv.y < 0.12 || vUv.y > 0.88) { col = uConc * 0.35 * L; }
    else { col = s * 1.15; em = 0.85; }
  } else if (kind < 4.5) {
    // ---- teto: embaixo escuro com a treliça; em cima a lona clara
    if (vK.y < 0.5) {
      vec3 c = uConc * 0.32;
      float tr = abs(fract((vUv.x + vUv.y * 4.0) / 2.0) - 0.5);
      float tr2 = abs(fract((vUv.x - vUv.y * 4.0) / 2.0) - 0.5);
      if (min(tr, tr2) < 0.035 || fract(vUv.y * 4.0) < 0.06) c = uConc * 0.6;
      col = c * (uAmb + uKey * 0.25);
    } else {
      vec3 c = vec3(0.6, 0.62, 0.66) * (0.9 + 0.1 * step(0.5, fract(vUv.x / 1.5)));
      col = c * (uAmb * 1.3 + uKey * 0.3);
    }
  } else if (kind < 5.5) {
    // ---- beirada do teto com a fileira de refletores
    float lx = fract(vUv.x / 1.4);
    vec3 c = vec3(0.05, 0.055, 0.07);
    if (lx > 0.08 && lx < 0.92 && vUv.y > 0.16 && vUv.y < 0.84) {
      vec2 g = fract(vec2(lx * 4.0, vUv.y * 2.0));
      float on = step(0.14, g.x) * step(g.x, 0.86) * step(0.12, g.y) * step(g.y, 0.88);
      c = on > 0.5 ? uLamp * 1.7 : vec3(0.12);
      em = on;
    }
    col = em > 0.0 ? c : c * L;
  } else if (kind < 6.5) {
    // ---- telão (4 quadros; o quadro da vez vem de uScrF)
    vec2 q = vUv;
    if (q.x < 0.025 || q.x > 0.975 || q.y < 0.045 || q.y > 0.955) col = vec3(0.03, 0.035, 0.045) * L;
    else {
      vec2 st = (q - vec2(0.025, 0.045)) / vec2(0.95, 0.91);
      float f = mod(uScrF + vK.y * (uScrF < 2.5 ? 1.0 : 0.0), 3.0);
      if (uScrF > 2.5) f = 3.0;
      vec3 s = texture(uScr, vec2(st.x, (f + 1.0 - st.y) * 0.25)).rgb;
      vec2 px = st * vec2(96.0, 54.0);
      s *= 0.7 + 0.3 * step(0.2, fract(px.x)) * step(0.2, fract(px.y));
      col = s * 1.25;
      em = 1.0;
    }
  } else if (kind < 7.5) {
    // ---- bandeirão
    vec3 s = texture(uFlag, vec2(vUv.x, (vK.y + 1.0 - vUv.y) * 0.5)).rgb;
    col = s * L * vSh;
  } else if (kind < 8.5) {
    // ---- torre: treliça de metal (os vãos são vazados)
    vec2 g = fract(vUv * vec2(2.2, 2.4));
    float bar = step(g.x, 0.13) + step(0.87, g.x) + step(abs(g.x - g.y), 0.09) + step(g.y, 0.08);
    if (bar < 0.5) discard;
    col = vec3(0.32, 0.34, 0.38) * (uAmb + uKey * vK.z * 0.5);
  } else {
    // ---- painel de refletores da torre (6 x 3)
    vec2 g = fract(vUv * vec2(6.0, 3.0));
    float on = step(0.12, g.x) * step(g.x, 0.88) * step(0.14, g.y) * step(g.y, 0.86);
    col = on > 0.5 ? uLamp * 1.9 : vec3(0.06);
    em = on;
  }
  float f = exp(-length(uCam - vPos) * uFogK);
  // névoa clareando perto do teto (a luz dos refletores espalhando no ar)
  vec3 fogC = uFog + uHaze * smoothstep(3.0, 21.0, vPos.y);
  col = mix(fogC, col, f);
  oCol = vec4(col, 1.0);
  oGlow = vec4(em > 0.0 ? col * f * min(em, 1.0) * 0.9 : max(col - 0.85, 0.0) * 0.5, 1.0);
}`;
  const VS_FX = `#version 300 es
layout(location=0) in vec3 aA;
layout(location=1) in vec3 aB;
layout(location=2) in vec4 aC;
uniform mat4 uVP; uniform vec3 uCam; uniform vec3 uRight; uniform vec3 uUp; uniform float uT; uniform float uFogK;
out vec2 vQ; flat out float vKind; out float vI; out float vF;
void main() {
  float kind = aC.x;
  vKind = kind;
  vec3 p;
  vQ = aC.yz;
  vI = aC.w;
  if (kind < 1.5) {
    // facho: fita do refletor (aA) ao chão (aB), girada em volta do eixo para a câmera
    float al = aC.z;
    vec3 P = mix(aA, aB, al);
    vec3 ax = normalize(aB - aA);
    vec3 toC = uCam - P;
    vec3 sd = cross(ax, toC);
    float ls = length(sd);
    sd = ls > 1e-4 ? sd / ls : uRight;
    float w = kind < 0.5 ? mix(0.6, 3.0, al) : mix(1.2, 4.6, al);
    p = P + sd * aC.y * w * 0.5;
    // visto de ponta (olhando ao longo do facho) a fita some
    vI = aC.w * smoothstep(0.12, 0.42, ls / max(length(toC), 1e-3));
    vQ = vec2(aC.y, al);
  } else if (kind < 2.5) {
    // brilho do refletor: placa virada para a câmera, puxada na direção dela (não corta no teto)
    vec3 toC = uCam - aA;
    float d = max(length(toC), 1e-3);
    vec3 P = aA + toC / d * min(1.2, d * 0.25);
    float s = aB.x * (0.55 + d * 0.045);
    vec2 sz = aB.y > 0.5 ? vec2(s * 5.0, s * 0.18) : vec2(s);
    p = P + uRight * aC.y * sz.x + uUp * aC.z * sz.y;
    // (o refletor aponta para o campo: de frente brilha mais)
    float face = dot(toC / d, normalize(vec3(${CX.toFixed(2)}, 0.0, ${CY.toFixed(2)}) - aA));
    vI = aC.w * smoothstep(-0.2, 0.7, face);
  } else if (kind < 3.5) {
    // grão de poeira flutuando na luz
    vec3 P = aA + vec3(sin(uT * 0.31 * aB.y + aB.x) * 0.35, sin(uT * 0.23 * aB.y + aB.x * 2.0) * 0.25, cos(uT * 0.27 * aB.y + aB.x * 3.0) * 0.35);
    float d = length(uCam - P);
    float s = 0.016 + d * 0.0022;
    p = P + (uRight * aC.y + uUp * aC.z) * s;
    vI = aC.w * (0.5 + 0.5 * sin(uT * 1.7 + aB.x * 5.0)) * smoothstep(0.4, 2.0, d);
  } else {
    // poça de luz no gramado
    p = aA + vec3(aC.y * aB.x, 0.0, aC.z * aB.x * aB.y);
  }
  vF = exp(-length(uCam - p) * uFogK);
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS_FX = `#version 300 es
precision highp float;
in vec2 vQ; flat in float vKind; in float vI; in float vF;
uniform vec3 uLamp; uniform float uT; uniform float uBeam;
${OUT}
void main() {
  float a;
  if (vKind < 1.5) {
    float x = vQ.x;
    float y = vQ.y / ${BEAM_END.toFixed(2)};
    a = exp(-x * x * 2.6) * pow(1.0 - y, 0.75) * smoothstep(0.0, 0.04, y) * vI * uBeam;
    // névoa/poeira mexendo dentro do facho
    a *= 0.78 + 0.22 * sin(y * 23.0 - uT * 0.9 + x * 2.0) * sin(y * 9.0 + uT * 0.6 - x * 3.0);
  } else if (vKind < 2.5) {
    float r2 = dot(vQ, vQ);
    if (r2 > 1.0) discard;
    a = vI * (exp(-r2 * 7.0) * 0.95 + exp(-r2 * 1.8) * 0.2) * (1.0 - r2);
  } else {
    float r2 = dot(vQ, vQ);
    if (r2 > 1.0) discard;
    a = vI * (1.0 - r2) * (vKind > 3.5 ? (1.0 - r2) * uBeam : 1.0);
  }
  vec3 col = uLamp * a * vF;
  oCol = vec4(col, 1.0);
  oGlow = vec4(col * (vKind > 1.5 && vKind < 2.5 ? 0.85 : 0.2), 1.0);
}`;

  // ---------------------------------------------------------------- texturas do tema
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const rgb = (c) => Hub.rgbOf(c).map((v) => v / 255);
  const sh = (c, k) => window.PixelRenderer.shade(c, k);
  const noAcc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const RF = { willReadFrequently: true };
  const ptext = (g, s, x, y, c, k = 1, al = 'left') => Hub.ptext(g, noAcc(s), x, y, c, k, al);
  // textos de cada tema (faixas de LED, telões, bandeirões)
  function words(th) {
    const club = window.PRO_CLUBS?.[window.App?.state?.proClub];
    const cn = club ? noAcc(club.name) : 'LIGA EUROPEIA';
    if (th.id === 'japan') return { a: [noAcc(th.name), 'JAPAO', 'ESTADIO NACIONAL', 'BLUE LOCK'], b: ['NIPPON', 'EGOIST', 'SELECAO', 'VAMOS JAPAO'], chant: 'NIPPON!', big: 'JAPAO', flags: ['#f8fafc', '#ef4444'] };
    if (th.id === 'worldcup') return { a: [noAcc(th.name), 'MUNDIAL', 'FINAL', 'BLUE LOCK'], b: ['COPA', 'JAPAO', 'EGOIST', 'O MUNDO TE VE'], chant: 'OLE OLE!', big: 'MUNDIAL', flags: ['#facc15', '#1d4ed8'] };
    return { a: [cn, 'LIGA EUROPEIA', 'TEMPORADA', 'EGOIST'], b: [cn.split(' ')[0], 'VAMOS', 'CAMPEOES', 'BLUE LOCK'], chant: 'VAMOS!', big: cn.split(' ')[0], flags: [club?.color || th.acc, club?.secondary || '#f8fafc'] };
  }
  // faixa de LED (1024 x 32: duas faixas de 16 px). As palavras se repetem e o espaço entre
  // elas estica para fechar exatamente 1024 px: a faixa repete sem emenda
  const LED_W = 1024;
  function ledCanvas(th, W) {
    const cv = canvas(LED_W, 32);
    const g = cv.getContext('2d', RF);
    g.fillStyle = '#04050a';
    g.fillRect(0, 0, LED_W, 32);
    const strip = (y0, list, bg, fg, acc) => {
      g.fillStyle = bg;
      g.fillRect(0, y0, LED_W, 16);
      const wOf = (ws) => ws.reduce((t, s) => t + s.length * 8 + 22, 0);
      const words = list.slice();
      while (words.length > 1 && wOf(words) > LED_W) words.pop();
      const n = Math.max(1, Math.floor(LED_W / wOf(words)));
      const seq = [];
      for (let k = 0; k < n; k++) seq.push(...words);
      const extra = Math.max(0, (LED_W - n * wOf(words)) / seq.length);
      let x = 0;
      seq.forEach((s) => {
        const w = s.length * 8;
        ptext(g, s, Math.round(x + 6), y0 + 3, fg, 2);
        // separador: losango aceso no meio do vão
        const sx = Math.round(x + 6 + w + (16 + extra) / 2 - 3);
        g.fillStyle = acc;
        g.fillRect(sx, y0 + 7, 4, 2);
        g.fillRect(sx + 1, y0 + 6, 2, 4);
        x += w + 22 + extra;
      });
    };
    strip(0, W.a, '#05070d', th.id === 'japan' ? '#f8fafc' : th.led || '#f8fafc', th.acc);
    strip(16, W.b, sh(th.acc2, -0.55), '#f8fafc', th.acc);
    return cv;
  }
  // o rosto do jogador para o telão (o boneco do jogo de frente, 72 x 72), guardado por
  // aparência e cor da camisa; draw = desenhar agora se ainda não tiver
  const FACES = new Map();
  function portrait(th, draw) {
    const p = (window.App && window.App.state && window.App.state.profile) || {};
    const jersey = th.id === 'pro' ? th.acc : '#1d4ed8';
    const k = [p.skinColor, p.hairColor, p.hairSecondary, p.eyeColor, p.eyeStyle, p.hairStyle, p.number, jersey].join('|');
    if (FACES.has(k)) return FACES.get(k);
    if (!draw) return null;
    const me = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: jersey, jerseySecondary: '#f8fafc', number: p.number };
    const sc = canvas(72, 72);
    const sg = sc.getContext('2d');
    sg.imageSmoothingEnabled = false;
    window.PixelRenderer.drawCharacterSprite(sg, me, 72, 72, { facing: 'front', frame: 1, animState: 'idle', view: 'front' });
    FACES.set(k, sc);
    return sc;
  }
  // telões: 4 quadros de 96 x 54 (logo, você, o grito da torcida, GOL)
  function screenCanvas(th, W) {
    const cv = canvas(96, 216);
    const g = cv.getContext('2d', RF);
    g.imageSmoothingEnabled = false;
    const R2 = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    // 0: logo do tema com "AO VIVO"
    R2(0, 0, 96, 54, sh(th.acc2, -0.5));
    for (let y = 0; y < 54; y += 4) R2(0, y, 96, 2, sh(th.acc2, -0.42));
    R2(0, 40, 96, 14, '#020617');
    ptext(g, W.big.slice(0, 7), 48, 12, '#f8fafc', 3, 'center');
    R2(10, 32, 76, 2, th.acc);
    ptext(g, 'AO VIVO', 64, 44, '#f8fafc', 1, 'left');
    R2(57, 45, 4, 4, '#ef4444');
    ptext(g, noAcc(th.name).slice(0, 12), 6, 44, sh(th.acc, 0.3), 1, 'left');
    // 1: você (rosto em pixel art) com o nome e o número. O rosto sai do boneco do jogo
    // (desenhar o boneco custa dezenas de ms): fica guardado e, na 1ª vez, é desenhado um
    // pouco depois (portrait = null: o telão mostra só o nome e o número até ele chegar)
    const y1 = 54;
    R2(0, y1, 96, 54, '#0b1220');
    R2(0, y1, 40, 54, sh(th.acc, -0.4));
    try {
      const p = window.App.state.profile;
      const face = portrait(th, false);
      if (face) g.drawImage(face, 6, 4, 46, 46, -2, y1 + 2, 44, 52);
      else ptext(g, '#' + (p.number || 11), 20, y1 + 20, '#f8fafc', 2, 'center');
      ptext(g, '#' + (p.number || 11), 46, y1 + 8, th.acc, 2, 'left');
      ptext(g, noAcc(p.name || 'VOCE').split(' ')[0].slice(0, 9), 46, y1 + 24, '#f8fafc', 1, 'left');
      ptext(g, 'ATACANTE', 46, y1 + 34, '#94a3b8', 1, 'left');
    } catch (e) {
      ptext(g, 'VOCE', 48, y1 + 22, '#f8fafc', 2, 'left');
    }
    R2(40, y1 + 46, 56, 2, th.acc);
    // 2: o grito da torcida (palmas)
    const y2 = 108;
    R2(0, y2, 96, 54, '#020617');
    for (let i = 0; i < 70; i++) R2((i * 37) % 96, y2 + 30 + ((i * 13) % 22), 3, 3, [th.acc, '#f8fafc', th.acc2, '#1e293b'][i % 4]);
    ptext(g, W.chant, 48, y2 + 10, '#facc15', 2, 'center');
    // 3: GOL (com raios)
    const y3 = 162;
    R2(0, y3, 96, 54, '#7f1d1d');
    g.save();
    g.beginPath();
    g.rect(0, y3, 96, 54);
    g.clip();
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? '#b91c1c' : '#991b1b';
      g.beginPath();
      g.moveTo(48, y3 + 27);
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      g.lineTo(48 + Math.cos(a0) * 80, y3 + 27 + Math.sin(a0) * 80);
      g.lineTo(48 + Math.cos(a1) * 80, y3 + 27 + Math.sin(a1) * 80);
      g.fill();
    }
    g.restore();
    ptext(g, 'GOOOL!', 49, y3 + 18, '#020617', 3, 'center');
    ptext(g, 'GOOOL!', 48, y3 + 17, '#facc15', 3, 'center');
    return cv;
  }
  // bandeirões (2 de 64 x 32)
  function flagCanvas(th, W) {
    const cv = canvas(64, 64);
    const g = cv.getContext('2d', RF);
    const R2 = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    const disc = (cx, cy, r, c) => {
      for (let y = -r; y <= r; y++) {
        const w = Math.round(Math.sqrt(r * r - y * y));
        R2(cx - w, cy + y, w * 2, 1, c);
      }
    };
    if (th.id === 'japan') {
      R2(0, 0, 64, 32, '#f1f5f9');
      disc(32, 16, 9, '#dc2626');
      R2(0, 32, 64, 32, '#1d4ed8');
      for (let x = 0; x < 64; x += 8) R2(x, 32, 4, 2, '#f8fafc');
      ptext(g, 'NIPPON', 32, 45, '#f8fafc', 1, 'center');
      disc(32, 40, 3, '#ef4444');
      ptext(g, 'NIPPON', 32, 45, '#f8fafc', 1, 'center');
    } else if (th.id === 'worldcup') {
      R2(0, 0, 64, 32, '#7f1d1d');
      R2(0, 2, 64, 2, '#facc15');
      R2(0, 28, 64, 2, '#facc15');
      // taça
      R2(8, 9, 8, 6, '#facc15');
      R2(10, 15, 4, 4, '#facc15');
      R2(8, 19, 8, 3, '#ca8a04');
      ptext(g, 'MUNDIAL', 40, 13, '#facc15', 1, 'center');
      R2(0, 32, 64, 32, '#1d4ed8');
      R2(0, 32, 64, 10, '#f8fafc');
      R2(0, 54, 64, 10, '#f8fafc');
      disc(32, 48, 5, '#dc2626');
      ptext(g, 'JAPAO', 32, 56, '#1d4ed8', 1, 'center');
    } else {
      const a = W.flags[0];
      const b = W.flags[1];
      for (let x = 0; x < 64; x += 8) R2(x, 0, 4, 32, a);
      for (let x = 4; x < 64; x += 8) R2(x, 0, 4, 32, b);
      R2(0, 11, 64, 10, '#020617');
      ptext(g, W.big.slice(0, 10), 32, 14, '#f8fafc', 1, 'center');
      R2(0, 32, 64, 32, sh(a, -0.35));
      ptext(g, 'VAMOS', 32, 39, '#f8fafc', 2, 'center');
      R2(4, 58, 56, 2, b);
    }
    return cv;
  }
  // cores da torcida de cada tema: camisas (8) e cadeiras
  function colorsOf(th) {
    if (th.id === 'japan') return { shirts: ['#1d4ed8', '#1e40af', '#2563eb', '#f8fafc', '#1d4ed8', '#ef4444', '#172554', '#60a5fa'], seat: '#1e3a8a' };
    if (th.id === 'worldcup') return { shirts: ['#facc15', '#1d4ed8', '#f8fafc', '#dc2626', '#16a34a', '#1d4ed8', '#f97316', '#e2e8f0'], seat: '#7f1d1d' };
    const club = window.PRO_CLUBS?.[window.App?.state?.proClub];
    const a = club?.color || th.acc;
    const b = club?.secondary || th.acc2;
    return { shirts: [a, a, b, '#f8fafc', a, sh(a, -0.3), b, '#111827'], seat: sh(a, -0.55) };
  }
  const SKINS = ['#f1c9a5', '#d9a77f', '#8d5a3b', '#f3d6bd'];
  // paleta da torcida para o shader, cadeiras e as cores médias (para longe)
  function palette(th) {
    const C = colorsOf(th);
    const pal = C.shirts.map(rgb);
    const s = rgb(C.seat);
    // de longe: o corpo médio (camisa com o vão escuro e um pouco de pele) e a fileira média
    // (encosto embaixo, corpo, fundo escuro em cima: 4 + 7 + 3 px)
    const body = [0, 1, 2].map((k) => (pal.reduce((t, c) => t + c[k], 0) / 8) * 0.67 + s[k] * 0.38 * 0.33 + [0.85, 0.66, 0.5][k] * 0.07);
    const avg = [0, 1, 2].map((k) => (s[k] * 1.08 * 4 + body[k] * 7 + s[k] * 0.38 * 3) / 14);
    return { pal: new Float32Array(pal.flat()), seat: new Float32Array(s), avg: new Float32Array(avg), body: new Float32Array(body) };
  }
  const SKIN = new Float32Array(SKINS.map(rgb).flat());
  // As 4 fileiras pintadas no muro do campo (textura da parede 'arena' do js/hub3d.js, em
  // cima das placas de LED): gente parada no mesmo desenho da torcida do shader, 8 px por
  // pessoa (8 por ladrilho: a textura repete sem cortar ninguém). y = 2..58 da textura.
  function wallCrowd(g, th, TW) {
    const C = colorsOf(th);
    const F = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    let s = 11 + th.acc.length;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    const bg = sh(C.seat, -0.62);
    for (let r = 0; r < 4; r++) {
      const y0 = 2 + r * 14;
      F(0, y0, TW, 14, bg);
      F(0, y0 + 10, TW, 4, C.seat);
      F(0, y0 + 10, TW, 1, sh(C.seat, 0.25));
      for (let x = 0; x < TW; x += 8) {
        if (rnd() < 0.05) continue;
        const c = C.shirts[Math.floor(rnd() * 8)];
        const skin = SKINS[Math.floor(rnd() * 4)];
        const hr = rnd();
        F(x + 2, y0 + 5, 4, 6, c);
        F(x + 5, y0 + 5, 1, 6, sh(c, -0.3));
        F(x + 3, y0 + 2, 2, 3, skin);
        F(x + 3, y0 + 1, 2, 1, hr < 0.6 ? '#121010' : hr < 0.85 ? '#4c2d17' : '#a8803d');
        if (rnd() < 0.22) {
          F(x + 1, y0 + 1, 1, 5, c);
          F(x + 6, y0 + 1, 1, 5, c);
          F(x + 1, y0, 1, 1, skin);
          F(x + 6, y0, 1, 1, skin);
        }
      }
    }
  }

  // ---------------------------------------------------------------- estado
  const E = { gl: null, failed: false, sets: new Map(), base: 0.25, hype: 0.25, hypeT: 0.25, hypeUntil: 0, seen: null };

  function texFrom(gl, cv, o = {}) {
    const g = cv.getContext('2d', RF);
    const d = new Uint8Array(g.getImageData(0, 0, cv.width, cv.height).data.buffer);
    const t = G3.texture2D(cv.width, cv.height, d, { mip: !!o.mip });
    if (o.repeat) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    }
    return t;
  }
  // texturas e cores do tema (guardadas por prédio: a volta de uma cena é na hora)
  function themeSet(gl, th) {
    const key = World.key;
    let s = E.sets.get(key);
    if (s) return s;
    const t0 = performance.now();
    const W = words(th);
    const tm = [];
    const lap = (v) => (tm.push(Math.round(performance.now() - t0)), v);
    s = {
      led: lap(texFrom(gl, ledCanvas(th, W), { mip: true, repeat: true })),
      scr: lap(texFrom(gl, screenCanvas(th, W))),
      flag: lap(texFrom(gl, flagCanvas(th, W))),
      p: palette(th),
      flagA: new Float32Array(rgb(W.flags[0])),
      flagB: new Float32Array(rgb(W.flags[1])),
      lamp: new Float32Array(th.lamp.map((v) => v / 255)),
      amb: new Float32Array(th.amb.map((v) => (v / 255) * 0.5))
    };
    E.texMs = Math.round(performance.now() - t0) + ' (' + tm.join('/') + ')';
    E.sets.set(key, s);
    // o rosto do telão ainda não estava pronto: desenha daqui a pouco e reenvia o telão
    if (!portrait(th, false)) {
      setTimeout(() => {
        try {
          if (E.gl !== gl || E.sets.get(key) !== s) return;
          portrait(th, true);
          const cv = screenCanvas(th, W);
          const d = new Uint8Array(cv.getContext('2d', RF).getImageData(0, 0, cv.width, cv.height).data.buffer);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, s.scr);
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cv.width, cv.height, gl.RGBA, gl.UNSIGNED_BYTE, d);
        } catch (e) {}
      }, 900);
    }
    while (E.sets.size > 3) {
      const k = E.sets.keys().next().value;
      const o = E.sets.get(k);
      [o.led, o.scr, o.flag].forEach((t) => gl.deleteTexture(t));
      E.sets.delete(k);
    }
    return s;
  }
  // Os programas do estádio são montados sem travar o jogo: com KHR_parallel_shader_compile
  // a placa compila em paralelo e a gente só pergunta se acabou. No mapa espera os quadros
  // que precisar (a compilação começa assim que o tema do estádio entra, ainda dentro do
  // prédio); na cena de cinema espera na hora (o 1º quadro dela já é preto).
  function startProgram(gl, vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const p = gl.createProgram();
    const a = mk(gl.VERTEX_SHADER, vs);
    const b = mk(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a);
    gl.attachShader(p, b);
    gl.linkProgram(p);
    return { p, a, b };
  }
  function finishProgram(gl, o) {
    if (!gl.getProgramParameter(o.p, gl.LINK_STATUS)) {
      throw new Error('shader do estádio: ' + (gl.getShaderInfoLog(o.b) || gl.getShaderInfoLog(o.a) || gl.getProgramInfoLog(o.p)));
    }
    const locs = {};
    return { p: o.p, u: (n) => (n in locs ? locs[n] : (locs[n] = gl.getUniformLocation(o.p, n))) };
  }
  // pronto para desenhar? (wait = fazer tudo agora; sem wait, no mapa, vai um pedaço por
  // quadro: a placa compila enquanto a geometria é montada aos poucos)
  function setup(gl, wait) {
    if (E.gl !== gl) {
      // (contexto novo: tudo o que era do antigo morreu com ele)
      E.gl = gl;
      E.sets = new Map();
      E.prog = null;
      E.fx = null;
      E.job = null;
      E.vao = null;
    }
    if (!E.prog && !E.job) {
      E.par = gl.getExtension('KHR_parallel_shader_compile');
      E.jobT = performance.now();
      E.job = { s: startProgram(gl, VS_SOLID, FS_SOLID), f: startProgram(gl, VS_FX, FS_FX) };
      if (!wait) return false;
    }
    // a geometria (uma vez por sessão, não depende do tema nem do contexto)
    if (!E.geo) {
      if (!E.geoGen) {
        E.geoGen = solidGeometryGen();
        E.buildMs = 0;
        E.buildStep = 0;
      }
      const t0 = performance.now();
      let r;
      do r = E.geoGen.next();
      while (!r.done && wait);
      if (r.done) {
        E.geo = r.value;
        E.geoGen = null;
        E.fxGeo = fxGeometry(E.geo.towers);
      }
      const ms = performance.now() - t0;
      E.buildMs = Math.round(E.buildMs + ms);
      E.buildStep = Math.max(E.buildStep, Math.round(ms));
      if (!wait) return false;
    }
    if (!E.prog) {
      const done = (o) => !E.par || gl.getProgramParameter(o.p, E.par.COMPLETION_STATUS_KHR);
      if (!wait && !(done(E.job.s) && done(E.job.f))) return false;
      const t0 = performance.now();
      E.prog = finishProgram(gl, E.job.s);
      E.fx = finishProgram(gl, E.job.f);
      E.job = null;
      E.compileMs = Math.round(performance.now() - E.jobT);
      E.blockMs = Math.round(performance.now() - t0);
      if (!wait) return false;
    }
    if (E.vao) return true;
    const mkVao = (data, layout, stride) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      let off = 0;
      layout.forEach((n, i) => {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, n, gl.FLOAT, false, stride * 4, off * 4);
        off += n;
      });
      gl.bindVertexArray(null);
      return vao;
    };
    E.vao = mkVao(E.geo.data, [3, 2, 4, 3], 12);
    E.n = E.geo.data.length / 12;
    E.vaoFx = mkVao(E.fxGeo.data, [3, 3, 4], 10);
    return true;
  }

  // a torcida: animação (0..1) que cai devagar; a ola passa de vez em quando
  function crowdState(T) {
    const now = performance.now();
    if (now > E.hypeUntil) E.hypeT = E.base;
    E.hype += (E.hypeT - E.hype) * 0.04;
    // ola: a cada ~55 s, duas voltas de 8 s
    const per = 55;
    const ph = T % per;
    const on = ph > 30 && ph < 46 ? Math.min(1, (ph - 30) / 2, (46 - ph) / 2) : 0;
    return { hype: E.hype, wave: on, waveP: (ph - 30) / 8 };
  }

  function drawSolid(gl, VP, eye, F, hub, cc, th, s) {
    const P = E.prog;
    const T = (hub.t || 0) / 60;
    // (nas cenas de cinema o relógio começa no 0 da cena: a ola passa logo, dos 3 aos 19 s)
    const st = crowdState(cc && cc.sk ? T + 27 : T);
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform3fv(P.u('uCam'), eye);
    gl.uniform3fv(P.u('uFog'), F.fog);
    gl.uniform1f(P.u('uFogK'), F.fogK * 0.8);
    gl.uniform3f(P.u('uHaze'), s.lamp[0] * 0.1, s.lamp[1] * 0.1, s.lamp[2] * 0.11);
    gl.uniform1f(P.u('uT'), T);
    gl.uniform1f(P.u('uHype'), st.hype);
    gl.uniform1f(P.u('uWave'), st.wave);
    gl.uniform1f(P.u('uWaveP'), st.waveP);
    gl.uniform3fv(P.u('uPal'), s.p.pal);
    gl.uniform3fv(P.u('uSkin'), SKIN);
    gl.uniform3fv(P.u('uSeat'), s.p.seat);
    gl.uniform3fv(P.u('uAvg'), s.p.avg);
    gl.uniform3fv(P.u('uBody'), s.p.body);
    // a cena de cinema escurece o ambiente (silêncio, noite): o estádio acompanha
    let k = 1;
    if (cc && cc.ambient) {
      const a = cc.ambient;
      k = Math.max(0.35, Math.min(1.15, (a[0] * 0.3 + a[1] * 0.55 + a[2] * 0.15) / 0.85));
    }
    gl.uniform3f(P.u('uAmb'), s.amb[0] * k, s.amb[1] * k, s.amb[2] * k);
    gl.uniform3f(P.u('uKey'), s.lamp[0] * 0.72 * k, s.lamp[1] * 0.72 * k, s.lamp[2] * 0.72 * k);
    gl.uniform3fv(P.u('uLamp'), s.lamp);
    gl.uniform3f(P.u('uConc'), 0.2, 0.22, 0.28);
    gl.uniform3fv(P.u('uFlagA'), s.flagA);
    gl.uniform3fv(P.u('uFlagB'), s.flagB);
    // telão: troca de quadro a cada 5 s; com a torcida explodindo (gol) fica no GOL
    gl.uniform1f(P.u('uScrF'), st.hype > 0.85 ? 3 : Math.floor(T / 5) % 3);
    gl.uniform1i(P.u('uLed'), 0);
    gl.uniform1i(P.u('uScr'), 1);
    gl.uniform1i(P.u('uFlag'), 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, s.flag);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.scr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s.led);
    gl.bindVertexArray(E.vao);
    gl.drawArrays(gl.TRIANGLES, 0, E.n);
    gl.bindVertexArray(null);
  }
  function drawFx(gl, VP, eye, look, F, hub, cc, s) {
    const P = E.fx;
    const T = (hub.t || 0) / 60;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform3fv(P.u('uCam'), eye);
    // eixos da câmera (as placas de brilho e poeira ficam viradas para ela)
    let fx = look[0] - eye[0];
    let fy = look[1] - eye[1];
    let fz = look[2] - eye[2];
    let l = Math.hypot(fx, fy, fz) || 1;
    fx /= l;
    fy /= l;
    fz /= l;
    let rx = -fz;
    let rz = fx;
    l = Math.hypot(rx, rz) || 1;
    rx /= l;
    rz /= l;
    const ux = -rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy;
    gl.uniform3f(P.u('uRight'), rx, 0, rz);
    gl.uniform3f(P.u('uUp'), ux, uy, uz);
    gl.uniform1f(P.u('uT'), T);
    gl.uniform1f(P.u('uFogK'), F.fogK * 0.8);
    gl.uniform3fv(P.u('uLamp'), s.lamp);
    // (cena que apagou as luzes: sem fachos)
    let k = 1;
    if (cc && cc.ambient) {
      const a = cc.ambient;
      k = Math.max(0.25, Math.min(1.1, (a[0] * 0.3 + a[1] * 0.55 + a[2] * 0.15) / 0.85));
    }
    gl.uniform1f(P.u('uBeam'), k * (window.HubEstadio.beamK || 1));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(E.vaoFx);
    const G = E.fxGeo;
    // fachos e poeira: só na cor (o brilho/bloom dobrava o custo de somar luz na tela
    // inteira); nos níveis leves de qualidade eles nem são desenhados
    if ((G3.level || 0) < 4) {
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
      gl.drawArrays(gl.TRIANGLES, 0, G.nBeams);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    }
    // poças no gramado e o brilho dos refletores (as torrinhas do campo só no mapa: as
    // cenas de cinema desenham o flare delas em 2D)
    const to = cc && cc.sk ? G.nRoof : G.n;
    gl.drawArrays(gl.TRIANGLES, G.nBeams, to - G.nBeams);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  // deu erro na placa de vídeo: volta a arquibancada simples (o 3D remonta no próximo quadro)
  function fail(err) {
    console.error('[estadio] erro na placa de vídeo, voltando à arquibancada simples:', err);
    E.failed = true;
    E.err = String((err && err.message) || err).slice(0, 120);
    G3.lost = true;
  }

  // ---------------------------------------------------------------- liga no 3D
  window.HubEstadio = {
    STAD,
    RINGS,
    ROOF,
    inside,
    wallCrowd,
    // o estádio novo está valendo? (se der erro na placa de vídeo, volta a arquibancada antiga)
    replaces() {
      return !E.failed && !((window.HubEstadio.dbg || 0) & 4); // (dbg 4: testes, a arquibancada antiga)
    },
    // desenhar neste quadro? Só nos temas do estádio, com a câmera no campo, no túnel do
    // treino (vê pela porta) ou fora do prédio (no alto, nas arquibancadas). Dentro do prédio
    // o teto esconde tudo; a área vazia das cenas (x > 76) e a cidade (y > 34,5) não veem.
    wants(hub, eye, cc) {
      if (E.failed || (window.HubEstadio.dbg || 0) & 4) return false;
      const th = World.th;
      if (!th || !STAD[th.id]) return false;
      // (o tema do estádio entrou: já começa a compilar os programas, sem esperar)
      // (e, com o programa pronto, as texturas do tema saem antes de você chegar ao campo)
      if (!E.prog || !E.sets.has(World.key)) {
        try {
          const gl = G3.ctx && G3.ctx();
          if (gl && setup(gl, false)) themeSet(gl, th);
        } catch (err) {
          fail(err);
          return false;
        }
      }
      const x = eye[0];
      const y = eye[2];
      if (x > 76 || x < 22 || y > 34.5 || y < -14) return false;
      const a = World.areaAt(x, y);
      let ok;
      if (a === 'campo' || a === 'treino') ok = true;
      else if (a) ok = eye[1] > WALL_H;
      else ok = true;
      if (ok) E.seen = { at: performance.now(), cine: !!cc, field: a === 'campo' || !a, x, y, th: th.id };
      return ok;
    },
    draw(gl, VP, eye, look, F, hub, cc, pass) {
      if (E.failed) return;
      try {
        // (no mapa, enquanto a placa ainda compila, o estádio só aparece uns quadros depois)
        if (!setup(gl, !!(cc && cc.sk))) return;
        const th = World.th;
        const s = themeSet(gl, th);
        const dbg = window.HubEstadio.dbg || 0; // (testes: 1 = sem a parte sólida, 2 = sem a luz)
        if (pass === 0) {
          if (!(dbg & 1)) drawSolid(gl, VP, eye, F, hub, cc, th, s);
        } else if (!(dbg & 2)) drawFx(gl, VP, eye, look, F, hub, cc, s);
      } catch (err) {
        fail(err);
      }
    },
    // a torcida se anima: k = 0..1 por secs segundos (gol = 1); depois volta ao normal
    excite(k = 1, secs = 6) {
      E.hypeT = k;
      E.hypeUntil = performance.now() + secs * 1000;
    },
    // a última vez que o estádio apareceu na tela (o som da torcida segue isso)
    get seen() {
      return E.seen;
    },
    // (testes) quanto custa montar a geometria: total e o maior pedaço (ms), n vezes
    benchGeo(n = 5) {
      const tot = [];
      let big = 0;
      for (let i = 0; i < n; i++) {
        const g = solidGeometryGen();
        let t = performance.now();
        const t0 = t;
        while (!g.next().done) {
          const now = performance.now();
          big = Math.max(big, now - t);
          t = now;
        }
        tot.push(performance.now() - t0);
      }
      return { total: tot.map(Math.round), maiorPedaco: Math.round(big) };
    },
    get info() {
      return { verts: E.n || 0, fx: E.fxGeo ? E.fxGeo.n : 0, buildMs: E.buildMs, buildStep: E.buildStep, compileMs: E.compileMs, blockMs: E.blockMs, texMs: E.texMs, par: !!E.par, failed: E.failed, err: E.err, sets: E.sets.size };
    }
  };
})();
