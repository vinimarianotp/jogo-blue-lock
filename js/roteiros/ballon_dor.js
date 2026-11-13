// ============================================================================
// 53 · ballon_dor — "Paris assiste da rua" (CUTSCENE_STYLE §6, conceito A do lote 1)
// Epílogo (Cap. 20): "Paris, um mês depois" → ESTA cena abre a gala → a 54
// (bola_de_ouro_discurso, o discurso) vem logo depois. Uma gala só (decisão do dono).
// Assinatura: a Bola de Ouro vista de fora. Paris assiste pela tela na fachada do teatro, e
// o nome aparece primeiro para a rua, junto com a fala da apresentadora. Um plano só lá
// dentro (o envelope, de longe). Pico: a tremida forte quando a rua inteira pula.
// A rua, a fachada e a torre são montadas na área vazia (K.VOID); o teatro por dentro é o
// mesmo da 54 (CE.c3fTheatre, de js/cine3d_final.js).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, mix, rnd, tela, brilho, placa } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  // cor de quem fala que não está na tabela central (a mesma da 54)
  const COR_APRESENTADORA = '#fde68a';

  // ---------------------------------------------------------------- a rua de Paris
  // o teatro de frente para o sul (fachada em y = 10); a rua e a multidão de y 11,6 a 19
  const TEA = { x0: 79.4, x1: 92.6, y: 10, alto: 5.4 };
  const TELA = { x: 86, z: 2.35, w: 4.6, h: 2.6 };
  const TAPETE = { x0: 85.35, x1: 86.65, y0: 10, y1: 12.4 };

  // a fachada do teatro em pixel: pedra clara, arcos acesos, colunas, cornija e telhado
  const fachadaTeatro = () =>
    tela('c53|teatro', 264, 108, (g, w, h) => {
      g.fillStyle = '#b9a47c';
      g.fillRect(0, 0, w, h);
      // fiadas da pedra
      g.fillStyle = '#a8946e';
      for (let y = 4; y < h; y += 6) g.fillRect(0, y, w, 1);
      // cornija e o telhado de ardósia com as lucarnas
      g.fillStyle = '#4a4458';
      g.fillRect(0, 0, w, 14);
      for (let x = 10; x < w; x += 26) {
        g.fillStyle = '#d6c49c';
        g.fillRect(x, 3, 8, 9);
        g.fillStyle = '#ffd38a';
        g.fillRect(x + 2, 6, 4, 5);
      }
      g.fillStyle = '#e2d2aa';
      g.fillRect(0, 14, w, 3);
      g.fillStyle = '#8a7756';
      g.fillRect(0, 17, w, 1);
      // as colunas e os arcos do térreo (portas acesas)
      for (let i = 0; i < 9; i++) {
        const x = 8 + i * 28.5;
        g.fillStyle = '#d8c7a0';
        g.fillRect(x - 2, 60, 5, h - 60);
        g.fillStyle = '#8a7756';
        g.fillRect(x + 3, 60, 1, h - 60);
        if (i < 8) {
          const ax = x + 6;
          g.fillStyle = '#6b4a2a';
          g.fillRect(ax, 76, 17, h - 76);
          g.beginPath();
          g.arc(ax + 8.5, 76, 8.5, Math.PI, 0);
          g.fill();
          g.fillStyle = '#ffcf7a';
          g.fillRect(ax + 2, 78, 13, h - 78);
          g.beginPath();
          g.arc(ax + 8.5, 78, 6.5, Math.PI, 0);
          g.fill();
          g.fillStyle = '#f0a850';
          g.fillRect(ax + 8, 78, 1, h - 78);
        }
      }
      // janelas altas do 1º andar (as dos lados; o meio fica atrás do telão)
      for (let i = 0; i < 8; i++) {
        if (i >= 2 && i <= 5) continue;
        const x = 14 + i * 28.5;
        g.fillStyle = '#3a3040';
        g.fillRect(x, 26, 12, 24);
        g.fillStyle = '#ffd38a';
        g.fillRect(x + 2, 28, 8, 20);
        g.fillStyle = '#d8c7a0';
        g.fillRect(x - 2, 50, 16, 2);
      }
      g.fillStyle = '#e2d2aa';
      g.fillRect(0, 56, w, 3);
    });
  // os prédios de Paris dos dois lados (pedra creme, sacadas de ferro, telhado mansarda)
  const haussmann = (sem) =>
    tela('c53|haus|' + sem, 128, 112, (g, w, h) => {
      g.fillStyle = '#a99978';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3e3a4c';
      g.fillRect(0, 0, w, 20);
      for (let x = 6; x < w; x += 20) {
        g.fillStyle = '#c9b88f';
        g.fillRect(x, 6, 8, 12);
        g.fillStyle = rnd(x, sem) < 0.35 ? '#ffd38a' : '#2a2638';
        g.fillRect(x + 2, 9, 4, 7);
      }
      g.fillStyle = '#cdbd94';
      g.fillRect(0, 20, w, 2);
      for (let a = 0; a < 4; a++) {
        const y = 26 + a * 21;
        for (let c = 0; c < 6; c++) {
          const x = 6 + c * 20;
          const on = rnd(a * 7 + c, sem) < 0.3;
          g.fillStyle = on ? '#ffcf7a' : '#2b2838';
          g.fillRect(x, y, 10, 15);
          if (on) {
            g.fillStyle = '#e8a850';
            g.fillRect(x + 4, y, 1, 15);
          }
          // a sacada de ferro
          g.fillStyle = '#1e1b28';
          g.fillRect(x - 2, y + 13, 14, 1);
          for (let k = 0; k < 14; k += 2) g.fillRect(x - 2 + k, y + 10, 1, 4);
        }
        g.fillStyle = '#968762';
        g.fillRect(0, y + 17, w, 1);
      }
      g.fillStyle = '#5a4a3a';
      g.fillRect(0, h - 12, w, 12);
      for (let x = 8; x < w; x += 24) {
        g.fillStyle = rnd(x, sem + 3) < 0.6 ? '#ffb85c' : '#3a2a20';
        g.fillRect(x, h - 10, 14, 10);
      }
    });
  // a cidade lá atrás (prédios em pixel) e a torre, numa tela que se mexe (os brilhos)
  const cidadeCv = () =>
    tela('c53|cidade', 512, 192, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.cineCity(g, w, h, 120, '#1c1636', 'rgba(253,224,71,0.45)', 13, 0);
      CE.cineCity(g, w, h, 70, '#140f28', 'rgba(251,191,36,0.55)', 17, 80);
    });
  let TORRE = null;
  let TORRE_KEY = '';
  function torreCv(S, brilhando) {
    if (!TORRE) {
      TORRE = document.createElement('canvas');
      TORRE.width = 128;
      TORRE.height = 256;
    }
    const key = `${CE._cineRun}|${S.phase}|${Math.floor(S.f / 4)}|${brilhando ? 1 : 0}`;
    if (key === TORRE_KEY) return { cv: TORRE, dirty: false };
    TORRE_KEY = key;
    const g = TORRE.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 128, 256);
    g.imageSmoothingEnabled = false;
    CE.finEiffel(g, 64, 250, 240, S.f);
    // o brilho das lâmpadas na hora cheia (quando a rua pula)
    if (brilhando) {
      for (let i = 0; i < 40; i++) {
        if (rnd(i + Math.floor(S.f / 3) * 41, 9) > 0.45) continue;
        const k = rnd(i, 3) * 0.9;
        const half = 48 * Math.pow(1 - k, 1.9) + 3;
        const x = 64 + (rnd(i, 4) - 0.5) * 2 * half;
        const y = 250 - 240 * k * 0.94;
        g.fillStyle = '#fffbea';
        g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
      }
    }
    return { cv: TORRE, dirty: true };
  }
  // a calçada de pedras (pavé)
  const pave = () =>
    tela('c53|pave', 64, 64, (g, w, h) => {
      g.fillStyle = '#3a3542';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 6) {
        for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) {
          g.fillStyle = rnd(x * 7 + y, 5) < 0.5 ? '#44404e' : '#4a4554';
          g.fillRect(x, y, 5, 5);
        }
      }
    });
  // o letreiro com as lâmpadas correndo (marquise)
  let MARQ = null;
  let MARQ_KEY = '';
  function marquise(S) {
    if (!MARQ) {
      MARQ = document.createElement('canvas');
      MARQ.width = 128;
      MARQ.height = 22;
    }
    const key = `${CE._cineRun}|${S.phase}|${Math.floor(S.f / 6)}`;
    if (key === MARQ_KEY) return { cv: MARQ, dirty: false };
    MARQ_KEY = key;
    const g = MARQ.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a0f22';
    g.fillRect(0, 0, 128, 22);
    g.fillStyle = '#ca8a04';
    g.fillRect(0, 0, 128, 1);
    g.fillRect(0, 21, 128, 1);
    CE.finPixelText(g, 'BOLA DE OURO', 64, 11, 1, '#fde68a', 'center', 112);
    for (let i = 0; i < 32; i++) {
      const on = (i + Math.floor(S.f / 6)) % 4 === 0;
      g.fillStyle = on ? '#fffbea' : '#a16207';
      g.fillRect(2 + i * 4, i % 2 ? 19 : 2, 2, 1);
    }
    return { cv: MARQ, dirty: true };
  }

  // ---------------------------------------------------------------- o telão da fachada
  // modo: 'aovivo' (o palco lá dentro) | 'envelope' | 'nome'
  let TV = null;
  let TV_KEY = '';
  function telao(S, modo, k) {
    if (!TV) {
      TV = document.createElement('canvas');
      TV.width = 160;
      TV.height = 90;
    }
    const key = `${CE._cineRun}|${S.phase}|${modo}|${Math.floor(S.t / 3)}|${Math.round(k * 8)}`;
    if (key === TV_KEY) return { cv: TV, dirty: false };
    TV_KEY = key;
    const g = TV.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    // o palco ao vivo: cortina, a luz em cima, a apresentadora com o envelope
    g.fillStyle = '#12071c';
    g.fillRect(0, 0, 160, 90);
    for (let x = 0; x < 160; x += 6) {
      g.fillStyle = x % 12 ? '#4a0a18' : '#5e0f22';
      g.fillRect(x, 0, 6, 60);
    }
    g.fillStyle = 'rgba(255,240,200,0.16)';
    g.beginPath();
    g.moveTo(72, 0);
    g.lineTo(88, 0);
    g.lineTo(104, 62);
    g.lineTo(56, 62);
    g.fill();
    g.fillStyle = '#2a1636';
    g.fillRect(0, 60, 160, 30);
    g.fillStyle = '#ca8a04';
    g.fillRect(0, 60, 160, 2);
    const host = CE.C3F_PRESENTER || {};
    if (modo !== 'nome') {
      g.fillStyle = host.clothesColor || '#0b0b12';
      g.fillRect(74, 40, 12, 20);
      g.fillStyle = host.skinColor || '#f1c9a5';
      g.fillRect(76, 30, 8, 9);
      g.fillStyle = host.hairColor || '#facc15';
      g.fillRect(75, 27, 10, 4);
      g.fillRect(75, 30, 2, 9);
      g.fillRect(83, 30, 2, 9);
      // o envelope dourado (fechado → aberto)
      g.fillStyle = '#facc15';
      g.fillRect(84, 42, 8, 6);
      if (modo === 'envelope' && k > 0) {
        g.fillStyle = '#fffbeb';
        g.fillRect(85, 42 - Math.round(4 * k), 6, 4);
      }
    }
    // a tarja da transmissão
    g.fillStyle = '#020617';
    g.fillRect(0, 70, 160, 20);
    g.fillStyle = '#ca8a04';
    g.fillRect(0, 70, 3, 20);
    if (modo === 'nome' && k > 0) {
      // o nome: grande, no meio da tela, a bola de ouro do lado
      g.fillStyle = 'rgba(18,7,28,0.85)';
      g.fillRect(0, 16, 160, 40);
      const nome = CE.cinePlayerName();
      CE.finPixelText(g, nome, 80, 32, 2, '#facc15', 'center', 150);
      CE.finPixelText(g, 'JAPÃO', 80, 47, 1, '#f8fafc', 'center', 60);
      CE.finPixelText(g, 'BOLA DE OURO', 80, 80, 1, '#fde68a', 'center', 140);
    } else {
      CE.finPixelText(g, modo === 'envelope' ? 'O ENVELOPE...' : 'AO VIVO • PARIS', 80, 80, 1, '#e2e8f0', 'center', 140);
      if (Math.floor(S.t / 20) % 2) {
        g.fillStyle = '#ef4444';
        g.fillRect(150, 4, 4, 4);
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < 90; y += 2) g.fillRect(0, y, 160, 1);
    return { cv: TV, dirty: true };
  }

  // figurantes da rua (casaco e cabelo variados), montados uma vez
  let POVO = null;
  const povo = () => {
    if (POVO) return POVO;
    const A = window.App || {};
    const cabelos = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const peles = A.CREATOR_SKIN || ['#f3d1b8'];
    const cores = A.CREATOR_HAIR_COLORS || ['#1b2340', '#3f2a1d', '#111827', '#78350f', '#e5e7eb'];
    const casacos = ['#1f2937', '#7f1d1d', '#1e3a8a', '#3f3f46', '#14532d', '#78350f', '#334155', '#4c1d95'];
    let s = 53;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    const L = [];
    for (let fi = 0; fi < 6; fi++) {
      for (let i = 0; i < 12; i++) {
        const x = 79.6 + i * 1.12 + (fi % 2) * 0.55 + (r(20) - 10) / 60;
        const y = 12.6 + fi * 1.08 + (r(20) - 10) / 70;
        // o tapete vermelho e a frente dele ficam livres
        if (x > TAPETE.x0 - 0.35 && x < TAPETE.x1 + 0.35 && y < 13.4) continue;
        if (r(10) < 2) continue;
        const hc = cores[r(cores.length)];
        const c = casacos[r(casacos.length)];
        L.push({ x, y, fone: r(4) === 0, fase: r(100) / 100, cd: { name: 'paris53_' + L.length, skinColor: peles[r(peles.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: cabelos[r(cabelos.length)], outfit: 'casual', clothesColor: c, jerseyPrimary: c, jerseySecondary: '#e5e7eb', number: 1 } });
      }
    }
    POVO = L;
    return L;
  };

  function rua(K, S, st, o) {
    const quente = [1.05, 0.86, 0.66];
    K.sky('#0a0c26', '#3a2a5e', 0.6);
    K.fog('#140f28', 0.012);
    K.ambient('#b49a86');
    // o fundo: a cidade e a torre (à direita do teatro)
    placa(K, { x: 86, y: -26, z: -2, w: 96, h: 34, ang: Math.PI / 2, img: cidadeCv(), color: '#ffffff', em: true, alpha: 0.999 });
    const tr = torreCv(S, !!o.brilho);
    placa(K, { x: 98.6, y: -7, z: -0.6, w: 9.5, h: 19, ang: Math.PI / 2, img: tr.cv, dirty: tr.dirty, color: '#ffffff', em: true, alpha: 0.999 });
    // o chão (pavé) e a rua
    K.floor({ x0: 60, y0: -30, x1: 116, y1: 40, z: -0.01, color: '#1a1622' });
    K.floor({ x0: 64, y0: 10, x1: 108, y1: 26, img: pave(), color: '#ffffff', light: [0.95, 0.85, 0.78] });
    // o teatro (caixa) e a fachada
    K.box({ x0: TEA.x0, y0: 3, x1: TEA.x1, y1: TEA.y - 0.02, z0: 0, z1: TEA.alto, color: '#5a4e3c', top: '#2a2636', light: quente });
    placa(K, { x: 86, y: TEA.y, z: 0, w: TEA.x1 - TEA.x0, h: TEA.alto, ang: Math.PI / 2, img: fachadaTeatro(), color: '#ffffff', light: [1.0, 0.88, 0.72] });
    // as luzes de baixo para cima na fachada (o dourado da gala)
    [80.8, 84, 88, 91.2].forEach((x) => K.floor({ x0: x - 1.4, y0: TEA.y + 0.02, x1: x + 1.4, y1: TEA.y + 1.4, z: 0.008, img: brilho('rgba(255,200,120,0.5)', 0.5, 0.05), color: '#ffffff', em: true, alpha: 0.999 }));
    // a marquise e o telão
    const mq = marquise(S);
    placa(K, { x: 86, y: TEA.y + 0.05, z: 1.62, w: 3.4, h: 0.58, ang: Math.PI / 2, img: mq.cv, dirty: mq.dirty, color: '#ffffff', em: true, alpha: 0.999 });
    K.box({ x0: TELA.x - TELA.w / 2 - 0.12, y0: TEA.y + 0.02, x1: TELA.x + TELA.w / 2 + 0.12, y1: TEA.y + 0.14, z0: TELA.z - 0.12, z1: TELA.z + TELA.h + 0.12, color: '#0b0710', light: quente });
    const tv = telao(S, o.modo, o.k || 0);
    placa(K, { x: TELA.x, y: TEA.y + 0.15, z: TELA.z, w: TELA.w, h: TELA.h, ang: Math.PI / 2, img: tv.cv, dirty: tv.dirty, color: '#c4bcc4', em: true, alpha: 0.999 });
    st.telao = R.ponto(TELA.x, TEA.y + 0.2, TELA.z + TELA.h / 2);
    // os prédios dos dois lados
    K.box({ x0: 66, y0: 2, x1: 79.2, y1: 9.6, z0: 0, z1: 6.4, img: haussmann(3), color: '#ffffff', top: '#3e3a4c', light: [0.9, 0.82, 0.74] });
    K.box({ x0: 92.8, y0: 2, x1: 106, y1: 9.6, z0: 0, z1: 6.0, img: haussmann(7), color: '#ffffff', top: '#3e3a4c', light: [0.9, 0.82, 0.74] });
    // o tapete vermelho vazio (todo mundo já entrou) com os pedestais e a corda
    K.floor({ x0: TAPETE.x0, y0: TAPETE.y0, x1: TAPETE.x1, y1: TAPETE.y1, z: 0.01, color: '#991b1b', light: [1.0, 0.85, 0.8] });
    [TAPETE.x0, TAPETE.x1].forEach((x) => K.floor({ x0: x - 0.03, y0: TAPETE.y0, x1: x + 0.03, y1: TAPETE.y1, z: 0.012, color: '#facc15', em: true }));
    [-1, 1].forEach((sd) => {
      const x = 86 + sd * 0.9;
      for (let y = 10.6; y <= 12.2; y += 0.8) {
        K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.42, color: '#ca8a04' });
        K.box({ x0: x - 0.05, y0: y - 0.05, x1: x + 0.05, y1: y + 0.05, z0: 0.42, z1: 0.48, color: '#fde047', em: true });
        if (y < 12.1) K.box({ x0: x - 0.015, y0: y, x1: x + 0.015, y1: y + 0.8, z0: 0.34, z1: 0.38, color: '#7f1d1d' });
      }
    });
    // as grades que seguram a multidão
    for (let x = 79.2; x < 93; x += 1.3) {
      if (x > TAPETE.x0 - 0.9 && x < TAPETE.x1 + 0.3) continue;
      K.box({ x0: x, y0: 12.05, x1: x + 1.2, y1: 12.1, z0: 0.06, z1: 0.42, color: '#9ca3af', light: [0.8, 0.78, 0.8], alpha: 0.85 });
    }
    // os postes de Paris (lanterna quente)
    [[77.0, 15.2], [95.0, 15.2], [81.2, 11.3], [90.8, 11.3]].forEach(([x, py]) => {
      K.box({ x0: x - 0.05, y0: py - 0.05, x1: x + 0.05, y1: py + 0.05, z0: 0, z1: 1.9, color: '#14121c' });
      K.box({ x0: x - 0.11, y0: py - 0.11, x1: x + 0.11, y1: py + 0.11, z0: 1.9, z1: 2.2, color: '#ffe2a8', em: true });
      K.sprite(brilho('rgba(255,214,150,0.6)'), { x, y: py, z: 1.75, w: 1.1, h: 1.1, glow: true, alpha: 0.75 });
      K.floor({ x0: x - 1.7, y0: py - 1.5, x1: x + 1.7, y1: py + 1.5, z: 0.008, img: brilho('rgba(255,200,130,0.4)'), color: '#ffffff', em: true, alpha: 0.999 });
    });
    // a luz do telão em cima da multidão
    K.floor({ x0: 82, y0: 10.2, x1: 90, y1: 17, z: 0.009, img: brilho('rgba(253,224,140,0.3)', 0.5, 0.0), color: '#ffffff', em: true, alpha: 0.999 * (o.luzTela ?? 0.8) });
  }
  // a multidão: parada olhando o telão; pula = 0..1 (a rua explode)
  function multidao(K, S, st, pula) {
    povo().forEach((p, i) => {
      const sobe = pula > 0 ? Math.abs(Math.sin(S.t * 0.2 + p.fase * 6.3)) * 0.22 * pula : 0;
      const anim = pula > 0.3 ? (i % 3 ? 'celebrate' : 'clap') : p.fone ? 'call_pass' : 'idle';
      K.actor(p.cd, { id: 'pv' + i, x: p.x, y: p.y, z: sobe, face: [86 + (p.x - 86) * 0.4, TEA.y], anim, frame: pula > 0.3 ? undefined : 0, k: 0.86, light: [0.92, 0.82, 0.72] });
      // o celular erguido de quem filma (a tela acesa em cima da cabeça)
      if (p.fone) st['fone' + i] = R.ponto(p.x + 0.04, p.y - 0.06, 0.96 + sobe);
    });
  }
  const fones = (ctx, S, st, a = 1) => {
    povo().forEach((p, i) => {
      const q = st['fone' + i];
      if (!q) return;
      ctx.fillStyle = `rgba(191,219,254,${0.85 * a})`;
      const s = Math.max(2, Math.round(4 * (S.W / 1280)));
      ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s), s, Math.round(s * 1.6));
    });
  };
  // o confete dourado em pixel (cai em cima da rua quando o nome sai)
  function confete(ctx, S, t, n, a = 1) {
    const { W, top, bot } = S;
    const cols = ['#facc15', '#fde68a', '#f8fafc', '#ca8a04', '#fef3c7'];
    const px = Math.max(3, Math.round(6 * (W / 1280)));
    ctx.save();
    ctx.globalAlpha = clamp(a);
    for (let i = 0; i < n; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.4 + rnd(i, 23) * 1.8)) % (bot - top));
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- o roteiro
  // a fala da apresentadora (a mesma da conversa de antes, agora dentro da cena) em três
  // partes: o envelope e o "Artilheiro da Copa..." lá dentro, o "...vai para o Japão" na rua
  // em silêncio e, no corte, o nome: na legenda e no telão no mesmo quadro
  const NOME_EM = 4;

  R('ballon_dor', {
    titulo: 'A BOLA DE OURO',
    musica: 'epic',
    grao: 0.05,
    vinheta: 0.5,
    leitura: 0.85,
    cores: { APRESENTADORA: COR_APRESENTADORA },
    cenario(K, t, st, pl, S) {
      if (pl.id === 'dentro') return;
      rua(K, S, st, pl.rua ? pl.rua(t) : { modo: 'aovivo' });
    },
    planos: [
      {
        // a rua lotada olhando o telão do teatro; o tapete vermelho vazio; a torre ao fundo
        id: 'rua',
        dur: 210,
        expo: 1.0,
        cam: { de: [[87.0, 0.95, 26.5], [86.3, 2.8, 9], 52], para: [[86.6, 3.4, 25.2], [86.3, 3.3, 9], 50], curva: 'suave' },
        cena(K, S, st) {
          multidao(K, S, st, 0);
        },
        sobre(ctx, S, K, st) {
          fones(ctx, S, st);
        },
        falas: [{ em: 40, quem: 'NARRADOR', texto: 'Paris inteira espera um nome.' }],
        letreiros: [{ em: 10, texto: 'PARIS • A NOITE DA BOLA DE OURO', cor: '#facc15' }]
      },
      {
        // o telão: a transmissão ao vivo, a apresentadora com o envelope fechado
        id: 'tela',
        dur: 200,
        expo: 1.0,
        rua: () => ({ modo: 'aovivo' }),
        cam: { de: [[85.3, 1.3, 18.8], [86.0, 2.55, 10], 46], para: [[85.55, 1.4, 17.9], [86.0, 2.7, 10], 42], curva: 'suave' },
        cena(K, S, st) {
          multidao(K, S, st, 0);
        },
        sobre(ctx, S, K, st) {
          fones(ctx, S, st);
          if (st.telao) CE.cineGlow(ctx, st.telao.x, st.telao.y, 260 * (S.W / 1280), 'rgba(253,224,140,0.18)', 1);
        },
        falas: [{ em: 50, quem: 'NARRADOR', texto: 'Ninguém mais erra o seu nome.' }]
      },
      {
        // lá dentro, de longe (de um camarote, do lado): o palco pequeno e o envelope abrindo
        id: 'dentro',
        dur: 330,
        expo: 1.3,
        cam: { de: [[90.6, 2.05, 17.6], [86.0, 0.55, 11.6], 36], para: [[90.4, 1.95, 17.2], [86.0, 0.58, 11.4], 32], curva: 'suave' },
        cena(K, S, st) {
          const TH = CE.C3F_THEATRE;
          if (CE.c3fTheatre) CE.c3fTheatre(K, { amb: '#c8a0b0' });
          if (CE.c3fAudience) CE.c3fAudience(K, { seed: 53, light: [0.92, 0.8, 0.84] });
          // o fundo do palco aceso de dourado (a gala, não um palco apagado) e as luzes da
          // ribalta na beira do palco
          placa(K, { x: 86, y: 9.08, z: 0.3, w: 9.4, h: 3.0, ang: Math.PI / 2, img: brilho('rgba(250,190,110,0.42)', 0.5, 0.75), color: '#ffffff', em: true, alpha: 0.999 });
          for (let x = 82.2; x < 90; x += 0.62) K.sprite(brilho('rgba(255,214,150,0.7)'), { x, y: 12.3, z: 0.36, w: 0.34, h: 0.34, glow: true, alpha: 0.8 });
          const z = TH ? TH.stageZ : 0.32;
          // a luz do palco em cima da apresentadora e o púlpito
          K.floor({ x0: 85.0, y0: 9.6, x1: 87.0, y1: 11.4, z: z + 0.006, img: brilho('rgba(254,240,138,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
          K.box({ x0: 86.35, y0: 10.55, x1: 86.75, y1: 10.85, z0: z, z1: z + 0.5, color: '#24142e', top: '#ca8a04' });
          const host = CE.C3F_PRESENTER || 'ANRI';
          K.actor(host, { id: 'host', x: 86.0, y: 10.45, z, ang: Math.PI / 2, frame: 0, k: 0.9, light: [1.08, 0.95, 0.85] });
          // o envelope dourado nas mãos (abre na fala)
          const ab = seg(S.t, 120, 150);
          K.box({ x0: 86.12, y0: 10.62, x1: 86.3, y1: 10.66, z0: z + 0.36, z1: z + 0.48, color: '#facc15', em: true });
          if (ab > 0) K.box({ x0: 86.15, y0: 10.61, x1: 86.27, y1: 10.63, z0: z + 0.44, z1: z + 0.44 + 0.1 * ab, color: '#fffbeb', em: true });
          st.env = R.ponto(86.21, 10.62, z + 0.46);
        },
        sobre(ctx, S, K, st) {
          if (st.env && S.t > 120) CE.finSparkle(ctx, st.env.x, st.env.y, 12 * (S.W / 1280), Math.max(0, Math.sin(S.t * 0.15)) * 0.9);
        },
        falas: [
          { em: 12, ate: 148, quem: 'APRESENTADORA', texto: '"O envelope, por favor."' },
          { em: 150, quem: 'APRESENTADORA', texto: '"Artilheiro da Copa, campeão do mundo, número 1 do Blue Lock..."' }
        ],
        letreiros: [{ em: 8, texto: 'THÉÂTRE DU CHÂTELET', cor: '#94a3b8' }]
      },
      {
        // de novo na rua, atrás da multidão parada: a fala chega pelo telão, o cartão sobe do
        // envelope e Paris prende a respiração
        id: 'espera',
        dur: 220,
        expo: 1.0,
        rua: (t) => ({ modo: 'envelope', k: seg(t, 40, 200), luzTela: 0.8 }),
        cam: { de: [[87.3, 1.25, 20.9], [86.0, 3.35, 10], 46], para: [[87.0, 1.32, 19.9], [86.0, 3.45, 10], 40], curva: 'suave' },
        cena(K, S, st) {
          multidao(K, S, st, 0);
        },
        sobre(ctx, S, K, st) {
          fones(ctx, S, st);
        },
        falas: [{ em: 12, quem: 'APRESENTADORA', texto: '"A Bola de Ouro deste ano vai para o Japão..."' }]
      },
      {
        // corte seco: o nome acende no telão e na legenda no mesmo quadro; um instante depois
        // a rua inteira pula (o pico) e a grua sobe por cima dela, até a torre brilhando
        id: 'pula',
        dur: 250,
        expo: 1.02,
        rua: (t) => ({ modo: t >= NOME_EM ? 'nome' : 'envelope', k: 1, brilho: t > 30, luzTela: 1.2 }),
        cam: { de: [[87.0, 1.32, 19.9], [86.0, 3.45, 10], 40], para: [[86.9, 4.7, 25.9], [86.4, 3.6, 6], 56], curva: 'easeIO', em: 34, ate: 250 },
        cena(K, S, st) {
          multidao(K, S, st, seg(S.t, 24, 32));
        },
        sobre(ctx, S, K, st) {
          fones(ctx, S, st, 0.6);
          if (st.telao) CE.cineGlow(ctx, st.telao.x, st.telao.y, 340 * (S.W / 1280), 'rgba(250,204,21,0.28)', 1 - 0.6 * seg(S.t, NOME_EM, NOME_EM + 80));
          confete(ctx, S, S.t, 60, seg(S.t, 26, 50));
        },
        falas: [{ em: NOME_EM, quem: 'APRESENTADORA', texto: () => `"${CE.cinePlayerName()}!"`, tipo: 'grito' }],
        efeitos: [{ tipo: 'tremor', em: 26, ate: 66, forca: 0.85, amp: 0.09 }],
        sons: [{ em: 26, som: 'gol', arg: true }]
      }
    ]
  });

  // ==========================================================================
  // A GALA PARA AS CONVERSAS (bg 'paris_gala', filmada pelo js/cine3d.js: CE.c3Sets.gala)
  // O mesmo teatro da 53/54 (antes a conversa ia para o saguão do Blue Lock): a plateia de
  // terno nas poltronas, quem fala no palco ou na 1ª fileira (o Noa aplaudindo de pé).
  // ==========================================================================
  const TERNO = { outfit: 'suit' };
  const LUGAR = {
    'VOCÊ': { x: 86.0, y: 10.7, z: 0.32, ang: Math.PI / 2, luz: [1.1, 1.0, 0.9], extra: TERNO },
    'NOEL NOA': { x: 84.75, y: 13.66, ang: -Math.PI / 2, anim: 'clap', luz: [1.0, 0.9, 0.86], extra: TERNO },
    APRESENTADORA: { x: 84.9, y: 10.5, z: 0.32, ang: Math.PI / 2, luz: [1.05, 0.95, 0.88] }
  };
  let PLATEIA = null;
  const plateia = () => {
    if (PLATEIA) return PLATEIA;
    const TH = CE.C3F_THEATRE;
    const SEATS = CE.C3F_SEATS || [];
    const A = window.App || {};
    const cabelos = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const peles = A.CREATOR_SKIN || ['#f3d1b8'];
    const cores = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 54;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    PLATEIA = [];
    if (!TH) return PLATEIA;
    for (let fi = 0; fi < 5; fi++) {
      SEATS.forEach((x, j) => {
        if ((j + fi) % 2 || (fi === 0 && Math.abs(x - 84.75) < 0.5)) return;
        const hc = cores[r(cores.length)];
        const c = ['#111827', '#1f2937', '#0f172a', '#3f1d2b', '#1e1b4b'][r(5)];
        const cd = { name: 'gala_' + PLATEIA.length, skinColor: peles[r(peles.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: cabelos[r(cabelos.length)], outfit: 'suit', jerseyPrimary: c, jerseySecondary: '#e5e7eb', number: 1 };
        const y = TH.row0 + fi * TH.step + 0.06;
        PLATEIA.push({ cd, x, y, z: fi * TH.rake, ang: -Math.PI / 2, anim: 'sit', seat: 0.16, luz: [0.66, 0.56, 0.6] });
      });
    }
    return PLATEIA;
  };
  const PLANO = {
    geral: [{ eye: [87.2, 2.3, 21.6], look: [86.0, 0.55, 11.2], fov: 50, drift: [-0.3, -0.05, -0.6] }, { eye: [90.9, 2.2, 18.0], look: [85.6, 0.55, 11.4], fov: 46, drift: [-0.2, -0.04, -0.3] }],
    'VOCÊ': { eye: [86.7, 0.95, 13.6], look: [86.0, 0.78, 10.7], fov: 42, drift: [-0.1, 0, -0.2] },
    'NOEL NOA': { eye: [85.7, 1.05, 11.9], look: [84.75, 0.62, 13.66], fov: 44, drift: [0.08, 0, -0.06] },
    APRESENTADORA: { eye: [85.8, 0.95, 13.4], look: [84.9, 0.78, 10.5], fov: 42, drift: [-0.1, 0, -0.2] }
  };
  CE.c3Sets = CE.c3Sets || {};
  CE.c3Sets.gala = {
    build(K) {
      if (CE.c3fTheatre) CE.c3fTheatre(K, { amb: '#c8a0b0' });
      K.floor({ x0: 84.6, y0: 9.6, x1: 87.4, y1: 11.6, z: 0.326, img: brilho('rgba(254,240,138,0.55)'), color: '#ffffff', em: true, alpha: 0.999 });
    },
    expo: 1.0,
    figurantes: () => plateia(),
    lugar(sp, i) {
      const up = String(sp || '').toUpperCase();
      const l = LUGAR[up] || LUGAR[Object.keys(LUGAR).find((k) => up.includes(k.split(' ')[0])) || ''];
      return l || { x: 87.4 + i * 0.6, y: 13.66, ang: -Math.PI / 2, luz: [0.95, 0.85, 0.8], extra: TERNO };
    },
    plano(sp, alt, ehVoce) {
      if (ehVoce) return PLANO['VOCÊ'];
      const up = String(sp || '').toUpperCase();
      const k = Object.keys(PLANO).find((n) => n !== 'geral' && (up === n || up.includes(n.split(' ')[0])));
      return k ? PLANO[k] : PLANO.geral[alt % 2];
    }
  };
  void mix;
  void lerp;
})();
