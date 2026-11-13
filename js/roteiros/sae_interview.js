// ============================================================================
// 25 · sae_interview — "Os cem flashes" (CUTSCENE_STYLE §6, conceito B do lote 1)
// Pós-jogo da Sub-20 do Japão (Cap. 9): a coletiva do Sae → o SEU nome → o Rin no vestiário.
// Assinatura: os flashes das câmeras como a respiração da sala. Soltos na pergunta, param no
// silêncio enquanto o Sae pensa e disparam TODOS juntos no seu nome; no vestiário, os mesmos
// flashes chegam pela TV e piscam em cima do Rin. Pico: o clarão curto no nome (um só).
// A sala de imprensa é montada na área vazia (K.VOID); o vestiário é o do prédio, o mesmo
// lugar da conversa que vem logo depois (bg 'locker_room').
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, rnd, tela, brilho, placa } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const TAU = Math.PI * 2;

  // cores de quem fala que não estão na tabela central (CUTSCENE_STYLE §1.2)
  const COR_REPORTER = '#a5b4fc';

  // ---------------------------------------------------------------- a sala de imprensa
  // Palco ao norte (y 9,6–11,8), plateia de y 13,2 a 18,2, câmeras de TV no fundo (y 20,4)
  const SALA = { x0: 80.6, x1: 91.4, y0: 9.6, y1: 22.4, h: 2.7, palco: 0.22 };
  const SAE_AT = [86, 10.62];
  const FILAS = [13.3, 14.3, 15.3, 16.3, 17.3, 18.3];
  const CORREDOR = [85.62, 86.38];

  // o painel do fundo (logos repetidos: JFU, JAPAN, SUB-20), em pixel
  // (logos tom sobre tom, sem branco: o painel é fundo, quem acende é o Sae e a luz dele)
  const painel = () =>
    tela('sae25|painel', 288, 96, (g, w, h) => {
      g.fillStyle = '#1a2e66';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#1c3270';
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 8);
      const logos = ['JFU', 'JAPAN', 'SUB-20'];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 8; c++) {
          const k = (r + c) % 3;
          const x = 16 + c * 37 + (r % 2) * 18;
          const y = 7 + r * 15;
          CE.finPixelText(g, logos[k], x, y, 1, k === 0 ? '#3a2a62' : k === 1 ? '#243c7e' : '#22397a', 'center', 34);
        }
      }
      g.fillStyle = '#5a1420';
      g.fillRect(0, h - 3, w, 3);
    });
  // a saia da mesa (azul da seleção com a faixa vermelha e o "JFU")
  const saia = () =>
    tela('sae25|saia', 96, 24, (g, w, h) => {
      g.fillStyle = '#0f2a6b';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#9b2c2c';
      g.fillRect(0, 2, w, 2);
      g.fillStyle = '#1e3a8a';
      g.fillRect(0, h - 4, w, 4);
      CE.finPixelText(g, 'JFU • SUB-20', w / 2, 13, 1, '#5d6f9e', 'center', w - 8);
    });
  // parede lateral (painéis acústicos escuros)
  const parede = () =>
    tela('sae25|parede', 64, 32, (g, w, h) => {
      g.fillStyle = '#1c2850';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#24335f';
      for (let x = 0; x < w; x += 16) g.fillRect(x + 1, 2, 14, h - 4);
      g.fillStyle = '#0b1024';
      g.fillRect(0, h - 5, w, 5);
    });
  // carpete da plateia
  const carpete = () =>
    tela('sae25|carpete', 64, 64, (g, w, h) => {
      g.fillStyle = '#2a3045';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = rnd(i, 3) < 0.5 ? '#30374e' : '#232838';
        g.fillRect(Math.floor(rnd(i, 4) * w), Math.floor(rnd(i, 5) * h), 2, 2);
      }
    });
  // o feixe do refletor em cima do Sae (degradê para o transparente)
  const feixe = () =>
    tela('sae25|feixe', 32, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,248,220,0.0)');
      gr.addColorStop(0.15, 'rgba(255,248,220,0.30)');
      gr.addColorStop(1, 'rgba(255,248,220,0.05)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w * 0.42, 0);
      g.lineTo(w * 0.58, 0);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fill();
    });

  // figurantes da imprensa (terno e cabelo variados), montados uma vez
  let IMPRENSA = null;
  const imprensa = () => {
    if (IMPRENSA) return IMPRENSA;
    const A = window.App || {};
    const cabelos = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const peles = A.CREATOR_SKIN || ['#f3d1b8'];
    const cores = ['#111827', '#1f2937', '#3f2a1d', '#0f172a', '#52525b', '#78350f', '#334155'];
    const ternos = ['#1f2937', '#111827', '#334155', '#3f3f46', '#1e293b', '#44403c'];
    let s = 25;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    const cd = (i) => {
      const hc = cores[r(cores.length)];
      return { name: 'imprensa25_' + i, skinColor: peles[r(peles.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: cabelos[r(cabelos.length)], outfit: 'casual', clothesColor: ternos[r(ternos.length)], jerseyPrimary: ternos[r(ternos.length)], jerseySecondary: '#e5e7eb', number: 1 };
    };
    const L = [];
    // sentados nas fileiras (alguns lugares vazios)
    FILAS.forEach((y, fi) => {
      for (let x = SALA.x0 + 1.0; x < SALA.x1 - 0.8; x += 0.66) {
        if (x > CORREDOR[0] - 0.2 && x < CORREDOR[1] + 0.2) continue;
        // (as duas primeiras cadeiras depois do corredor, na 1ª fileira, ficam vazias: de cima
        // do palco elas ficavam coladas na câmera)
        if (fi === 0 && x > CORREDOR[1] && x < 87.9) continue;
        if (r(10) < 3) continue;
        L.push({ cd: cd(L.length), x: x + (fi % 2) * 0.12, y: y + 0.04, pose: 'sit', foto: r(2) === 0 });
      }
    });
    // fotógrafos: agachados na frente do palco, em pé nas laterais e no fundo
    [83.1, 83.85, 84.6].forEach((x, i) => L.push({ cd: cd(L.length), x, y: 12.4 + (i % 2) * 0.12, pose: 'kneel_one', foto: true, alvo: true }));
    [14.9, 16.2, 17.5, 18.8].forEach((y) => {
      L.push({ cd: cd(L.length), x: SALA.x0 + 0.42, y, pose: 'idle', foto: true, alvo: true });
      L.push({ cd: cd(L.length), x: SALA.x1 - 0.42, y: y + 0.4, pose: 'idle', foto: true, alvo: true });
    });
    [82.0, 82.8, 89.2, 90.0].forEach((x) => L.push({ cd: cd(L.length), x, y: 19.7, pose: 'idle', foto: true, alvo: true }));
    IMPRENSA = L;
    return L;
  };
  // a câmera de cada fotógrafo: a altura do rosto (agachado, sentado ou em pé)
  const altCam = (p) => (p.pose === 'kneel_one' ? 0.5 : p.pose === 'sit' ? 0.62 : 0.78);

  function salaImprensa(K, o = {}) {
    const { x0, x1, y0, y1, h } = SALA;
    K.sky('#05070f', '#05070f', 0);
    K.fog('#0a0f1f', 0.02);
    K.ambient(o.amb || '#a3aed8');
    // chão, teto e paredes
    K.floor({ x0, y0, x1, y1, color: '#ffffff', img: carpete() });
    K.floor({ x0, y0, x1, y1, z: h, color: '#070a14' });
    placa(K, { x: (x0 + x1) / 2, y: y0 + 0.01, w: x1 - x0, h, ang: Math.PI / 2, color: '#0a1638' });
    placa(K, { x: (x0 + x1) / 2, y: y1 - 0.01, w: x1 - x0, h, ang: -Math.PI / 2, img: parede(), color: '#ffffff' });
    placa(K, { x: x0 + 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: parede(), color: '#ffffff' });
    placa(K, { x: x1 - 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: parede(), color: '#ffffff' });
    // o palco, a borda vermelha e o painel com os logos
    K.box({ x0: 82.4, y0, x1: 89.6, y1: 11.8, z0: 0, z1: SALA.palco, color: '#0b1220', top: '#14203a' });
    K.floor({ x0: 82.4, y0: 11.78, x1: 89.6, y1: 11.82, z: SALA.palco + 0.004, color: '#ef4444', em: true });
    placa(K, { x: 86, y: y0 + 0.03, z: SALA.palco, w: 7.2, h: 2.4, ang: Math.PI / 2, img: painel(), color: '#ffffff', light: o.painel || [0.78, 0.82, 0.98] });
    // a mesa (tampo e saia) e a cadeira do Sae
    K.box({ x0: 84.1, y0: 10.92, x1: 87.9, y1: 11.32, z0: SALA.palco + 0.36, z1: SALA.palco + 0.4, color: '#1e293b', top: '#334155' });
    placa(K, { x: 86, y: 11.33, z: SALA.palco, w: 3.8, h: 0.38, ang: Math.PI / 2, img: saia(), color: '#ffffff', light: o.mesa || [0.9, 0.92, 1.0] });
    K.box({ x0: SAE_AT[0] - 0.16, y0: SAE_AT[1] - 0.22, x1: SAE_AT[0] + 0.16, y1: SAE_AT[1] - 0.16, z0: SALA.palco, z1: SALA.palco + 0.62, color: '#111827' });
    // os microfones (haste + cabeça com a cor da emissora) e a garrafinha
    [[85.62, '#ef4444'], [85.8, '#38bdf8'], [86.0, '#facc15'], [86.2, '#22c55e'], [86.38, '#f8fafc']].forEach(([x, c], i) => {
      const y = 11.02 + (i % 2) * 0.05;
      K.box({ x0: x - 0.012, y0: y - 0.012, x1: x + 0.012, y1: y + 0.012, z0: SALA.palco + 0.4, z1: SALA.palco + 0.52, color: '#0b0f19' });
      K.box({ x0: x - 0.032, y0: y - 0.03, x1: x + 0.032, y1: y + 0.03, z0: SALA.palco + 0.5, z1: SALA.palco + 0.57, color: c, top: '#1f2937' });
    });
    K.box({ x0: 84.6, y0: 11.0, x1: 84.66, y1: 11.06, z0: SALA.palco + 0.4, z1: SALA.palco + 0.52, color: '#93c5fd', alpha: 0.7 });
    // o refletor em cima do Sae: o feixe e a poça de luz no palco
    const fz = o.feixe ?? 1;
    if (fz > 0) {
      K.quad({ x: SAE_AT[0], y: SAE_AT[1] + 0.25, z: SALA.palco, w: 1.7, h: h - SALA.palco, ang: Math.PI / 2, img: feixe(), color: '#ffffff', em: true, alpha: 0.5 * fz });
      K.floor({ x0: 84.8, y0: 9.9, x1: 87.2, y1: 11.7, z: SALA.palco + 0.006, img: brilho('rgba(255,244,214,0.55)'), color: '#ffffff', em: true, alpha: 0.999 * fz });
    }
    // luminárias do teto (fracas: a sala fica na penumbra, o palco é que acende)
    for (let y = 13; y < 21; y += 2.6) {
      [83.2, 88.8].forEach((x) => K.box({ x0: x - 0.5, y0: y - 0.14, x1: x + 0.5, y1: y + 0.14, z0: h - 0.04, z1: h, color: '#cbd5e1', em: true, alpha: o.teto ?? 0.55 }));
    }
    // a luz do teto no carpete (manchas largas: a plateia não some no escuro)
    for (let y = 13.4; y < 20; y += 2.6) [83.2, 88.8].forEach((x) => K.floor({ x0: x - 1.6, y0: y - 1.2, x1: x + 1.6, y1: y + 1.2, z: 0.008, img: brilho('rgba(203,213,240,0.32)'), color: '#ffffff', em: true, alpha: 0.999 * (o.teto ?? 0.55) }));
    // as cadeiras das fileiras
    FILAS.forEach((y) => {
      [[x0 + 0.62, CORREDOR[0] - 0.04], [CORREDOR[1] + 0.04, x1 - 0.5]].forEach(([a, b]) => {
        K.box({ x0: a, y0: y - 0.1, x1: b, y1: y + 0.14, z0: 0, z1: 0.16, color: '#1e293b', top: '#273449' });
        K.box({ x0: a, y0: y + 0.14, x1: b, y1: y + 0.2, z0: 0, z1: 0.42, color: '#1e293b' });
      });
    });
    // as duas câmeras de TV nos tripés, no fundo
    [[83.4, 20.5], [88.6, 20.5]].forEach(([x, y]) => {
      K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.86, color: '#0b0f19' });
      K.box({ x0: x - 0.13, y0: y - 0.2, x1: x + 0.13, y1: y + 0.16, z0: 0.86, z1: 1.04, color: '#1f2937', top: '#374151' });
      K.box({ x0: x - 0.05, y0: y - 0.3, x1: x + 0.05, y1: y - 0.2, z0: 0.9, z1: 0.99, color: '#0b0f19' });
      K.box({ x0: x + 0.06, y0: y + 0.1, x1: x + 0.1, y1: y + 0.14, z0: 1.0, z1: 1.03, color: '#ef4444', em: true });
    });
  }
  // o Sae (de terno da seleção) e a imprensa; brilho = luz da sala no disparo
  function elencoSala(K, st, o = {}) {
    const sae = CE.cineChar('sae', Object.assign({}, CE.KITS.u20));
    K.actor(sae, { id: 'sae', x: SAE_AT[0], y: SAE_AT[1], z: SALA.palco, ang: Math.PI / 2, anim: 'sit', seat: 0.2, frame: 0, light: o.saeLuz || [1.18, 1.14, 1.08] });
    const b = o.brilho || 0;
    imprensa().forEach((p, i) => {
      const luz = p.pose === 'sit' ? [0.72 + b * 0.45, 0.74 + b * 0.45, 0.9 + b * 0.35] : [0.8 + b * 0.45, 0.82 + b * 0.45, 0.98 + b * 0.3];
      const alvo = [86 + (p.x - 86) * 0.25, 10.8];
      K.actor(p.cd, { id: 'pr' + i, x: p.x, y: p.y, face: alvo, anim: p.pose, seat: p.pose === 'sit' ? 0.16 : undefined, frame: 0, k: 0.86, light: luz });
      if (!p.foto) return;
      // a câmera fotográfica na frente do rosto (virada para o palco)
      const dx = alvo[0] - p.x;
      const dy = alvo[1] - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const cx = p.x + (dx / d) * 0.13;
      const cy = p.y + (dy / d) * 0.13;
      const h = altCam(p);
      if (p.alvo) K.box({ x0: cx - 0.06, y0: cy - 0.05, x1: cx + 0.06, y1: cy + 0.05, z0: h - 0.05, z1: h + 0.04, color: '#0b0f19', top: '#1f2937' });
      st['f' + i] = R.ponto(cx + (dx / d) * 0.05, cy + (dy / d) * 0.05, h + 0.02);
    });
  }

  // ---------------------------------------------------------------- os flashes (a assinatura)
  // força do flash da câmera i no tempo t (0 = apagado); modo: 'solto' | 'silencio' | 'nome'
  function flashDe(i, t, modo, nome = 0) {
    const vida = 6;
    if (modo === 'silencio') return 0;
    if (modo === 'solto') {
      const per = 60 + rnd(i, 11) * 80;
      const ph = (t + rnd(i, 12) * per * 2) % per;
      return rnd(i, 13) < 0.8 && ph < vida ? 1 - ph / vida : 0;
    }
    // no nome: todo mundo dispara junto (0–5 quadros) e depois as rajadas vão rareando
    const u = t - nome;
    if (u < 0) return 0;
    const at = rnd(i, 21) * 5;
    if (u >= at && u < at + vida) return 1 - (u - at) / vida;
    const per = lerp(9, 40, clamp(u / 170)) * (0.7 + rnd(i, 22) * 0.6);
    const ph = (u - at - vida + rnd(i, 23) * per) % per;
    const vivo = rnd(i, 24) < lerp(1, 0.4, clamp((u - 40) / 120));
    return vivo && u > at + vida && ph < vida ? (1 - ph / vida) * 0.85 : 0;
  }
  function desenhaFlashes(ctx, S, st, modo, nome, esc = 1) {
    let soma = 0;
    imprensa().forEach((p, i) => {
      if (!p.foto) return;
      const a = flashDe(i, S.t, modo, nome);
      const pt = st['f' + i];
      if (a <= 0 || !pt) return;
      soma += a;
      const r = (p.alvo ? 1 : 0.85) * (S.W / 1280) * esc;
      CE.cineGlow(ctx, pt.x, pt.y, 95 * r, 'rgba(241,245,249,0.7)', a * 0.8);
      CE.finSparkle(ctx, pt.x, pt.y, (14 + 12 * a) * r, a);
    });
    return soma;
  }

  // ---------------------------------------------------------------- o vestiário
  // o Rin sentado no banco com a toalha na cabeça (pose que o 3D não tem: pixel art pronta
  // uma vez, em pé no mundo como um boneco)
  const UNIT = 0.0273;
  let SENTADO = null;
  const rinSentado = () => {
    const rin = CE.cineChar('rin', Object.assign({ angry: true }, CE.KITS.blueLock));
    const key = JSON.stringify([rin.hairColor, rin.skinColor, rin.jerseyPrimary]);
    if (SENTADO && SENTADO.key === key) return SENTADO;
    const e = CE.finSprEntry(rin, 180, {});
    const cv = document.createElement('canvas');
    cv.width = e.cv.width;
    cv.height = e.cv.height;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const pe = e.pad + 180 * 0.87;
    const cima = CE.rincSeat(g, rin, cv.width / 2, pe, 180, {});
    CE.rincTowel(g, cv.width / 2, cima, 180, '#97a5bb');
    cv.key = key;
    cv.pad = e.pad;
    SENTADO = cv;
    return cv;
  };
  const RIN_AT = [42.42, 21.2];
  const TV_AT = [40.3, 22.96];
  function rin(K, luz) {
    const cv = rinSentado();
    const s = UNIT / 5;
    const pe = (cv.height - (cv.pad + 33 * 5)) / cv.height;
    K.sprite(cv, { x: RIN_AT[0], y: RIN_AT[1], z: 0, w: cv.width * s, h: cv.height * s, foot: pe, light: luz, shadow: 0.2 });
  }
  // a TV do vestiário: a coletiva ao vivo em pixel; os flashes da sala piscam na tela e a
  // tarja traz a fala do Sae com o seu nome
  let TV = null;
  let TV_KEY = '';
  function tvTela(S, pops, nome) {
    if (!TV) {
      TV = document.createElement('canvas');
      TV.width = 96;
      TV.height = 60;
    }
    const key = `${CE._cineRun}|${S.phase}|${Math.floor(S.t / 3)}|${nome}`;
    if (key === TV_KEY) return { cv: TV, dirty: false };
    TV_KEY = key;
    const g = TV.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0b1d4d';
    g.fillRect(0, 0, 96, 60);
    for (let y = 3; y < 34; y += 8) for (let x = (y % 16) / 2; x < 96; x += 12) {
      g.fillStyle = (x + y) % 3 ? '#1e3a8a' : '#7f1d1d';
      g.fillRect(x, y, 6, 2);
    }
    const sae = CE.cineChar('sae', CE.KITS.u20);
    g.fillStyle = sae.jerseyPrimary || '#0b1d4d';
    g.fillRect(40, 27, 16, 10);
    g.fillStyle = sae.skinColor || '#f1c9a5';
    g.fillRect(43, 17, 10, 10);
    g.fillStyle = sae.hairColor || '#7f1d1d';
    g.fillRect(42, 14, 12, 5);
    g.fillRect(42, 17, 2, 6);
    g.fillRect(52, 17, 2, 4);
    g.fillStyle = '#0f172a';
    g.fillRect(0, 34, 96, 10);
    g.fillStyle = '#ef4444';
    g.fillRect(0, 34, 96, 1);
    g.fillStyle = '#111827';
    [38, 46, 54].forEach((x) => g.fillRect(x, 30, 2, 4));
    // os flashes da plateia na transmissão
    pops.forEach(([x, y, a]) => {
      if (a <= 0) return;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(x - 1, y, 3, 1);
      g.fillRect(x, y - 1, 1, 3);
      if (a > 0.6) g.fillRect(x - 2, y, 5, 1);
    });
    // a tarja
    g.fillStyle = '#020617';
    g.fillRect(0, 46, 96, 14);
    g.fillStyle = '#dc2626';
    g.fillRect(0, 46, 4, 14);
    if (nome) CE.finPixelText(g, `"${nome}."`, 50, 53, 1, '#f8fafc', 'center', 88);
    g.fillStyle = 'rgba(148,163,184,0.12)';
    for (let y = 0; y < 60; y += 2) g.fillRect(0, y, 96, 1);
    return { cv: TV, dirty: true };
  }
  // os flashes da transmissão (posições na tela da TV) e quanto a TV clareia o vestiário
  const TV_POPS = Array.from({ length: 14 }, (_, i) => [6 + Math.floor(rnd(i, 31) * 84), 26 + Math.floor(rnd(i, 32) * 18)]);
  function popsTV(t, rar) {
    let luz = 0;
    const L = TV_POPS.map(([x, y], i) => {
      const per = (20 + rnd(i, 33) * 40) * rar;
      const ph = (t + rnd(i, 34) * per) % per;
      const a = ph < 5 ? 1 - ph / 5 : 0;
      luz = Math.max(luz, a);
      return [x, y, a];
    });
    return { L, luz };
  }
  function vestiario(K, S, st, o) {
    K.c.noLights = true;
    K.sky('#020617', '#0b1a36', 0);
    // as luzes do teto apagadas: um forro escuro por baixo das luminárias e das faixas de
    // luz no alto das paredes (sobram a luminária em cima do Rin e a TV)
    const SOMBRA = [0.3, 0.3, 0.36];
    K.floor({ x0: 35, y0: 17, x1: 43, y1: 23, z: 1.6, color: '#252c48', light: [0.5, 0.5, 0.58] });
    [[39, 17.03, Math.PI / 2, 8], [39, 22.97, -Math.PI / 2, 8], [35.03, 20, 0, 6], [42.97, 20, Math.PI, 6]].forEach(([x, y, a, w]) => placa(K, { x, y, z: 1.36, w, h: 0.25, ang: a, color: '#1a2036', light: SOMBRA }));
    const { L, luz } = popsTV(S.t, o.rar);
    const pisca = (0.82 + 0.18 * Math.sin(S.t * 0.21) * Math.sin(S.t * 0.07)) * (o.tv ?? 1);
    const tv = tvTela(S, o.tv === 0 ? [] : L, CE.cinePlayerName());
    // a TV na parede sul (virada para dentro) e a luz dela no chão
    K.box({ x0: TV_AT[0] - 0.5, y0: TV_AT[1] - 0.02, x1: TV_AT[0] + 0.5, y1: TV_AT[1] + 0.04, z0: 0.7, z1: 1.34, color: '#05070c' });
    K.quad({ x: TV_AT[0], y: TV_AT[1] - 0.03, z: 0.74, w: 0.92, h: 0.56, ang: Math.PI / 2, img: tv.cv, dirty: tv.dirty, em: true, alpha: Math.max(0.05, pisca) });
    const fl = (0.1 + 0.16 * luz) * pisca;
    K.floor({ x0: TV_AT[0] - 1.6, y0: TV_AT[1] - 2.4, x1: TV_AT[0] + 1.6, y1: TV_AT[1] - 0.05, z: 0.01, img: brilho('rgba(147,197,253,0.8)', 0.5, 0.95), color: '#ffffff', em: true, alpha: Math.min(0.999, fl * 2.2) });
    // a única luz acesa: a luminária em cima do banco do Rin
    K.floor({ x0: RIN_AT[0] - 1.4, y0: RIN_AT[1] - 1.2, x1: RIN_AT[0] + 1.4, y1: RIN_AT[1] + 1.2, z: 0.012, img: brilho('rgba(255,236,200,0.85)'), color: '#ffffff', em: true, alpha: 0.999 });
    K.box({ x0: RIN_AT[0] - 0.3, y0: RIN_AT[1] - 0.08, x1: RIN_AT[0] + 0.3, y1: RIN_AT[1] + 0.08, z0: 1.5, z1: 1.55, color: '#fff7e6', em: true });
    K.box({ x0: RIN_AT[0] - 0.01, y0: RIN_AT[1] - 0.01, x1: RIN_AT[0] + 0.01, y1: RIN_AT[1] + 0.01, z0: 1.55, z1: 1.6, color: '#1f2937' });
    K.sprite(brilho('rgba(255,236,200,0.6)'), { x: RIN_AT[0], y: RIN_AT[1], z: 1.25, w: 1.2, h: 1.2, glow: true, alpha: 0.55 });
    // o Rin: a luz quente de cima e o azul da TV piscando nele a cada flash
    const b = luz * 0.6 * pisca;
    rin(K, [1.35 + b * 0.6, 1.28 + b * 0.75, 1.18 + b]);
    st.tv = R.ponto(TV_AT[0], TV_AT[1] - 0.05, 1.02);
    st.luz = luz * pisca;
    // cada flash da transmissão, no lugar dele na tela da TV (a estrelinha no 2D)
    if (o.tv !== 0) {
      L.forEach(([px, py, a], i) => {
        if (a <= 0.2) return;
        st['tvp' + i] = R.ponto(TV_AT[0] + 0.46 - (px / 96) * 0.92, TV_AT[1] - 0.06, 0.74 + 0.56 * (1 - py / 60));
        st['tva' + i] = a * pisca;
      });
    }
  }
  // as estrelinhas dos flashes na TV e o brilho dela no escuro
  function brilhoTV(ctx, S, st, forca) {
    if (st.tv) CE.cineGlow(ctx, st.tv.x, st.tv.y, 150 * (S.W / 1280), 'rgba(147,197,253,0.4)', forca * (0.5 + 0.5 * (st.luz || 0)));
    for (let i = 0; i < TV_POPS.length; i++) {
      const p = st['tvp' + i];
      if (p) CE.finSparkle(ctx, p.x, p.y, 9 * (S.W / 1280), st['tva' + i]);
    }
  }

  // ---------------------------------------------------------------- o roteiro
  // o seu nome dito pelo Sae (sem gritar: só as iniciais em maiúscula)
  const nomeBonito = () => CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const NOME = 92; // o quadro do plano 3 em que o Sae diz o seu nome

  R('sae_interview', {
    titulo: 'A COLETIVA DO SAE',
    musica: 'dread',
    tema: 'u20_national',
    grao: 0.05,
    vinheta: 0.55,
    cores: { 'REPÓRTER': COR_REPORTER },
    cenario(K, t, st, pl) {
      if (pl.id === 'vestiario' || pl.id === 'partiu') return;
      salaImprensa(K, pl.sala || {});
    },
    planos: [
      {
        // A PERGUNTA: do alto, no fundo da sala, por cima da imprensa; o Sae pequeno e nítido
        // sob o refletor; flashes soltos
        id: 'pergunta',
        dur: 220,
        expo: 1.0,
        cam: { de: [[86.7, 2.5, 21.7], [86, 0.55, 11.0], 46], para: [[86.35, 2.25, 20.2], [86, 0.6, 11.0], 38], curva: 'suave' },
        cena(K, S, st) {
          elencoSala(K, st);
        },
        sobre(ctx, S, K, st) {
          desenhaFlashes(ctx, S, st, 'solto');
          if (S.t === 30 || S.t === 118) window.SFX?.click?.();
        },
        falas: [{ em: 26, quem: 'REPÓRTER', texto: '"Alguém do Blue Lock te impressionou?"' }],
        letreiros: [{ em: 8, texto: 'ESTÁDIO NACIONAL • SALA DE IMPRENSA', cor: '#94a3b8' }]
      },
      {
        // O SILÊNCIO: do canto do palco, na altura da mesa; o Sae de perfil; a sala inteira
        // parada com as câmeras no rosto. Nenhum flash.
        id: 'silencio',
        dur: 200,
        expo: 0.92,
        sala: { teto: 0.35 },
        // (de cima do palco, no canto: nada entre a câmera e o Sae; a imprensa no fundo)
        cam: { de: [[89.3, 1.25, 10.3], [85.4, 0.5, 12.0], 46], para: [[89.05, 1.2, 10.35], [85.5, 0.52, 11.9], 42], curva: 'suave' },
        cena(K, S, st) {
          elencoSala(K, st, { saeLuz: [1.12, 1.1, 1.08] });
        },
        falas: [{ em: 40, quem: 'SAE ITOSHI', texto: '"...Tem um. Muito bom."' }]
      },
      {
        // O NOME: do fundo, de teleobjetiva, a sala inteira entre a câmera e o Sae. "Quem?",
        // o silêncio e, no nome, todos disparam juntos (o clarão é o pico da cena)
        id: 'nome',
        dur: 240,
        expo: (t) => 0.94 + 0.12 * (t >= NOME ? 1 - seg(t, NOME, NOME + 60) : 0),
        sala: { teto: 0.3, painel: [0.66, 0.68, 0.84] },
        cam: { de: [[86.1, 2.05, 21.3], [86, 0.66, 10.9], 21], para: [[86.05, 1.95, 20.6], [86, 0.68, 10.9], 17], curva: 'suave' },
        cena(K, S, st) {
          const u = S.t - NOME;
          const b = u >= 0 ? Math.max(0, 1 - u / 40) : 0;
          elencoSala(K, st, { brilho: b, saeLuz: [1.15 + b * 0.4, 1.12 + b * 0.4, 1.08 + b * 0.4] });
        },
        sobre(ctx, S, K, st) {
          desenhaFlashes(ctx, S, st, S.t < NOME ? 'silencio' : 'nome', NOME, 1.35);
          if (S.t === NOME) window.SFX?.click?.();
          if (S.t === NOME + 2) window.SFX?.click?.();
        },
        efeitos: [{ tipo: 'flash', em: NOME, ate: NOME + 7, forca: 0.62, segura: 1 }],
        falas: [
          { em: 8, ate: NOME - 14, quem: 'REPÓRTER', texto: '"Quem?"' },
          { em: NOME, quem: 'SAE ITOSHI', texto: () => `"${nomeBonito()}."` }
        ]
      },
      {
        // corte seco: o vestiário escuro; a TV na parede ainda passa a coletiva e os flashes
        // dela piscam em cima do Rin, sentado com a toalha na cabeça
        id: 'vestiario',
        dur: 210,
        expo: 0.55,
        // (o Rin à esquerda, a TV à direita, na mesma distância: o flash vai de uma ao outro)
        cam: { de: [[39.35, 0.82, 19.2], [41.45, 0.5, 21.75], 44], para: [[39.6, 0.78, 19.45], [41.5, 0.5, 21.8], 40], curva: 'suave' },
        cena(K, S, st) {
          vestiario(K, S, st, { rar: 1 });
        },
        sobre(ctx, S, K, st) {
          brilhoTV(ctx, S, st, 1);
        },
        falas: [{ em: 44, quem: 'RIN ITOSHI', texto: '"...o quê?"' }],
        letreiros: [{ em: 6, texto: 'VESTIÁRIO DO BLUE LOCK • AO MESMO TEMPO', cor: '#94a3b8' }]
      },
      {
        // da porta: o vestiário inteiro, o Rin sozinho embaixo da única luz; os flashes da
        // TV vão rareando até a tela ficar parada
        id: 'partiu',
        dur: 190,
        expo: 0.6,
        cam: { de: [[38.2, 1.12, 18.05], [41.4, 0.5, 21.6], 50], para: [[38.0, 1.18, 17.85], [41.5, 0.48, 21.6], 46], curva: 'suave' },
        cena(K, S, st) {
          vestiario(K, S, st, { rar: lerp(1.4, 6, seg(S.t, 0, 150)) });
        },
        sobre(ctx, S, K, st) {
          brilhoTV(ctx, S, st, 0.85);
        },
        falas: [{ em: 60, quem: 'NARRADOR', texto: 'Algo se partiu.' }]
      }
    ]
  });
})();
