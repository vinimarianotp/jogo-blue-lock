// ============================================================================
// 60 · duo_ressonancia — RESSONÂNCIA / ATAQUE DE DUPLA: um quadro, dois pulsos
// Conceito A do lote 1 (docs/cenas/CONCEITOS_LOTE1.md), regras em CUTSCENE_STYLE.md.
// Assinatura (reservada da 60): as pulseiras no mesmo batimento, num quadro só, grande,
// uma vez. As luzes das duas pulseiras piscam cada uma no seu ritmo (A em ciano, B em
// coral) e vão se alcançando até baterem juntas: o pico é esse clarão curto, dourado. Depois
// o resto é ação limpa: o passe e os dois chegando juntos na bola, o chute dos dois. A cena
// termina no contato, porque a partida mostra a bola entrando.
// Toca no Modo Dupla: no capítulo "Ressonância" e em todo Ataque de Dupla na partida, nas
// duas telas (js/duo_match.js). O estádio é o da partida (ou o holográfico do Blue Lock na
// história). Os dois vêm do CE.duoCast (A = quem fundou a dupla, B = o parceiro).
// O chute é dos dois ao mesmo tempo: assim a cena fica certa seja quem for que estava com a
// bola (a partida dá o gol para quem apertou o Ataque de Dupla).
// Substitui o registro antigo de js/cine3d_duo.js (este arquivo carrega depois).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const easeIO = R.curvas.easeIO;

  // as cores da dupla (as mesmas das outras cenas do Projeto Elo, js/cine3d_duo.js)
  const CA = '#38bdf8';
  const CB = '#fb7185';
  const OURO = '#fde047';
  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const PIX = 6;
  // mistura de duas cores #hex (k 0..1) → 'rgb(...)'
  const rgbDe = (c) => [1, 3, 5].map((i) => parseInt(String(c).slice(i, i + 2), 16) || 0);
  const mistura = (a, b, k) => {
    const A = rgbDe(a);
    const B = rgbDe(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))).join(',')})`;
  };

  // ---------------------------------------------------------------- a dupla
  const PARCEIRO = { name: 'Parceiro', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 };
  let CAST = null;
  function dupla() {
    if (CAST && CAST.run === CE._cineRun) return CAST;
    let c = null;
    try {
      c = CE.duoCast ? CE.duoCast() : null;
    } catch (e) {
      c = null;
    }
    if (!c || !c.a || !c.b) {
      const p = (window.App && window.App.state && window.App.state.profile) || {};
      c = { a: Object.assign({ skinColor: '#f3d1b8', hairStyle: 'spiky_tall' }, p, { id: 'duo_a' }), b: Object.assign({ id: 'duo_b' }, PARCEIRO) };
    }
    // quem marca: um rival de linha da partida (ou um figurante do Projeto Elo)
    let rival = null;
    const ME = window.MatchEngine;
    if (ME && ME.active && Array.isArray(ME.entities)) {
      const e = ME.entities.find((x) => x.team === 'away' && !x.isGK && x.charData);
      rival = e && e.charData;
    }
    if (!rival) rival = Object.assign({}, CE.cineChar('elo_gen_b'), { jerseyPrimary: '#334155', jerseySecondary: '#94a3b8' });
    if (!rival.name) rival = Object.assign({ name: 'Marcador', hairStyle: 'short_sharp', hairColor: '#1f2937', skinColor: '#e8c4a8', jerseyPrimary: '#334155', jerseySecondary: '#94a3b8' }, rival);
    CAST = { run: CE._cineRun, a: c.a, b: c.b, rival };
    return CAST;
  }
  const lado = (K, side, o) => K.actor(dupla()[side], Object.assign({ id: side, extra: Object.assign({ duoSide: side }, ELO) }, o));

  // ---------------------------------------------------------------- os dois batimentos
  // os batimentos de cada um (quadros do plano 1): fora de tempo no começo, cada vez mais
  // perto, e o último junto (SYNC)
  const SYNC = 100;
  const BATE_A = [8, 42, 72, SYNC];
  const BATE_B = [24, 54, 80, SYNC];
  // quanto a luz de um pulso está acesa agora (pisca e apaga em ~10 quadros)
  const luz = (bates, t) => bates.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + (b === SYNC ? 40 : 11)) : 0), 0);

  // ---------------------------------------------------------------- o antebraço em pixel art
  // Desenhado aqui (104 x 44 px de arte, ampliado 6x no quadro, sem suavizar), apontando para
  // a direita: a manga da camisa (com o punho na cor de cada um), o antebraço com 3 tons de
  // pele e contorno escuro, a pulseira do Elo com volume, os LEDs e a telinha "27", e a mão
  // fechada (dedos dobrados, nós dos dedos e o polegar por cima). O do parceiro é o espelho;
  // os números da telinha são desenhados sem espelhar, para lerem certo.
  const BW = 104;
  const BH = 44;
  const CY = 22;
  const PONTA = 100; // a ponta dos nós dos dedos (x da arte)
  const PULSEIRA = 60; // o meio da pulseira (x da arte)
  const DIG = { 2: ['0110', '1001', '0001', '0110', '1000', '1111'], 7: ['1111', '0001', '0010', '0010', '0100', '0100'] };
  const BRACOS = new Map();
  function bracoCv(side, skin, manga, punho, aceso, cor) {
    const key = [side, skin, manga, punho, aceso, cor].join('|');
    const pronto = BRACOS.get(key);
    if (pronto) return pronto;
    const cv = document.createElement('canvas');
    cv.width = BW;
    cv.height = BH;
    const g = cv.getContext('2d');
    const esp = side === 'b';
    const ponto = (x, y, c, w = 1, h = 1) => {
      g.fillStyle = c;
      g.fillRect(esp ? BW - x - w : x, y, w, h);
    };
    const pele = { base: skin, luz: mistura(skin, '#ffffff', 0.3), sombra: mistura(skin, '#3b2416', 0.3), funda: mistura(skin, '#3b2416', 0.55) };
    const CONT = '#2a160c';
    // coluna de pele com contorno e 3 tons (luz em cima, sombra embaixo)
    const coluna = (x, top, bot) => {
      for (let y = top; y <= bot; y++) {
        let c = pele.base;
        if (y === top || y === bot) c = CONT;
        else if (y <= top + 2) c = pele.luz;
        else if (y >= bot - 1) c = pele.funda;
        else if (y >= bot - 4) c = pele.sombra;
        ponto(x, y, c);
      }
    };
    // a manga (sai da borda do quadro) e o punho na cor de cada um
    const mLuz = mistura(manga, '#ffffff', 0.18);
    const mSom = mistura(manga, '#000000', 0.4);
    for (let x = 0; x <= 17; x++) {
      for (let y = CY - 14; y <= CY + 14; y++) {
        let c = manga;
        if (y === CY - 14 || y === CY + 14 || x === 17) c = '#050816';
        else if (x >= 13) c = y <= CY - 11 ? mistura(punho, '#ffffff', 0.35) : y >= CY + 10 ? mistura(punho, '#000000', 0.35) : punho;
        else if (y <= CY - 11) c = mLuz;
        else if (y >= CY + 9) c = mSom;
        else if (x === 5 || x === 10) c = mistura(manga, '#000000', 0.25); // dobras do pano
        ponto(x, y, c);
      }
    }
    // o antebraço afinando até o pulso (um pouco mais grosso perto do cotovelo)
    for (let x = 18; x < 70; x++) {
      const hh = Math.round(lerp(11, 8, (x - 18) / 51) + (x > 20 && x < 44 ? Math.sin(((x - 20) / 24) * Math.PI) : 0));
      coluna(x, CY - hh, CY + hh);
    }
    // a mão fechada: o dorso, e na frente os dedos dobrados com os nós
    for (let x = 70; x <= PONTA; x++) {
      let hh = x < 73 ? 8 + (x - 70) : 11;
      if (x >= 97) hh = 11 - (x - 96);
      coluna(x, CY - hh, CY + hh);
    }
    // os dedos dobrados: 4 faixas separadas por linhas escuras, cada uma com o nó saltado
    [CY - 6, CY - 1, CY + 4].forEach((y) => ponto(86, y, CONT, 12, 1));
    [CY - 9, CY - 4, CY + 1, CY + 6].forEach((y, i) => {
      ponto(86, y, pele.luz, 11, 1);
      ponto(PONTA + 1 - (i === 0 || i === 3 ? 1 : 0), y - 1, CONT, 1, 3);
      ponto(PONTA - (i === 0 || i === 3 ? 1 : 0), y, pele.luz, 1, 1);
    });
    ponto(85, CY - 9, pele.sombra, 1, 18); // a dobra entre o dorso e os dedos
    // o polegar por cima, dobrado sobre os dedos
    for (let x = 75; x <= 90; x++) {
      const top = CY - 13 + (x < 78 ? 78 - x : 0) + (x > 88 ? x - 88 : 0);
      for (let y = top; y <= CY - 9; y++) ponto(x, y, y === top ? CONT : y === top + 1 ? pele.luz : pele.base);
    }
    ponto(89, CY - 11, mistura(skin, '#ffffff', 0.5), 2, 1); // a unha
    ponto(76, CY - 9, CONT, 13, 1); // o vinco do polegar
    // a pulseira do Elo: mais grossa que o pulso, com tampa clara, segmentos e sombra
    const P0 = PULSEIRA - 8;
    const P1 = PULSEIRA + 8;
    for (let x = P0; x <= P1; x++) {
      for (let y = CY - 12; y <= CY + 12; y++) {
        let c = '#1f2937';
        if (x === P0 || x === P1 || y === CY - 12 || y === CY + 12) c = '#05070d';
        else if (y <= CY - 10) c = '#64748b';
        else if (y >= CY + 9) c = '#0b1220';
        else if ((x - P0) % 4 === 0) c = '#111827';
        ponto(x, y, c);
      }
    }
    // os LEDs na tampa
    for (let i = 0; i < 4; i++) ponto(P0 + 3 + i * 3, CY - 11, aceso ? cor : '#334155', 2, 1);
    // a telinha com o número da dupla (o "27" não espelha)
    const sx0 = PULSEIRA - 5;
    for (let x = sx0; x <= sx0 + 10; x++) for (let y = CY - 6; y <= CY + 6; y++) ponto(x, y, x === sx0 || x === sx0 + 10 || y === CY - 6 || y === CY + 6 ? '#334155' : '#020617');
    const dig = aceso ? cor : mistura(cor, '#020617', 0.45);
    ['2', '7'].forEach((d, k) => {
      DIG[d].forEach((linha, yy) => {
        for (let xx = 0; xx < 4; xx++) {
          if (linha[xx] !== '1') continue;
          // (sem espelhar: o x vai direto, contado da tela da pulseira já no lugar certo)
          const xTela = (esp ? BW - sx0 - 10 : sx0 + 1) + k * 5 + xx;
          g.fillStyle = dig;
          g.fillRect(xTela, CY - 3 + yy, 1, 1);
        }
      });
    });
    BRACOS.set(key, cv);
    return cv;
  }
  // desenha o antebraço no quadro, com a ponta dos dedos em xPonta (tela) e o meio em y
  function pulso(g, side, xPonta, y, o) {
    const c = dupla();
    const cd = side === 'b' ? c.b : c.a;
    const cv = bracoCv(side, cd.skinColor || '#f1c9a5', ELO.jerseyPrimary, side === 'b' ? CB : CA, o.lit, o.cor);
    const x0 = side === 'b' ? xPonta - (BW - PONTA - 1) * PIX : xPonta - (PONTA + 1) * PIX;
    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, Math.round(x0), Math.round(y - CY * PIX), BW * PIX, BH * PIX);
    g.restore();
  }
  // o quadro largo: os dois pulsos lado a lado, cada um no seu fundo de cor; a luz de cada
  // pulseira acende no batimento dele; no SYNC as duas batem juntas e viram ouro
  function quadroPulsos(ctx, S, k, t) {
    const CAx = CE.ART;
    if (!CAx || k <= 0) return;
    const { W, top, bot } = S;
    const sh = bot - top;
    const poly = [[36, top + sh * 0.16], [W - 36, top + sh * 0.12], [W - 36, top + sh * 0.8], [36, top + sh * 0.84]];
    const la = luz(BATE_A, t);
    const lb = luz(BATE_B, t);
    const junto = t >= SYNC;
    CAx.panel(
      ctx,
      poly,
      (b, g) => {
        const cx = b.x + b.w / 2 + b.ox;
        // os dois punhos quase se tocando no meio: a ponta dos dedos a "vao" do centro
        const vao = 10;
        const cy = b.y + b.h / 2 + 6;
        // as duas metades, chapadas na cor de cada um (escura); no batimento dele a metade
        // acende e as linhas de mangá saem da pulseira
        const pulseiraX = (lado) => cx + lado * (vao + (PONTA - PULSEIRA) * PIX);
        const fundo = (x0, x1, escuro, claro, linhas, aceso, lado) => {
          g.fillStyle = aceso > 0.05 ? (aceso > 0.5 ? claro : mistura(escuro, claro, aceso * 2)) : escuro;
          g.fillRect(x0, b.y, x1 - x0, b.h);
          if (aceso > 0.05) {
            g.save();
            g.beginPath();
            g.rect(x0, b.y, x1 - x0, b.h);
            g.clip();
            CAx.speedRadial(g, pulseiraX(lado), cy, S.W, S.H, { color: linhas, inner: b.h * 0.24, n: 40, thick: 1.3 });
            g.restore();
          }
        };
        if (!junto) {
          fundo(b.x, cx, '#0e3449', '#1f6f96', 'rgba(186,230,253,0.7)', la, -1);
          fundo(cx, b.x + b.w, '#660033', '#cc3366', 'rgba(254,205,211,0.7)', lb, 1);
        } else {
          // na batida junta: o quadro inteiro vira ouro, as linhas saem das duas pulseiras
          const q = seg(t, SYNC, SYNC + 34);
          g.fillStyle = mistura('#c79a12', '#5a4510', q);
          g.fillRect(b.x, b.y, b.w, b.h);
          CAx.speedRadial(g, cx, cy, S.W, S.H, { color: 'rgba(254,249,195,0.75)', inner: b.h * 0.34, n: 56, thick: 1.5 });
        }
        // o vão do meio (a divisória)
        g.fillStyle = '#020617';
        g.fillRect(cx - 4, b.y, 8, b.h);
        const pulsa = (aceso) => Math.round(aceso * 1.2) * PIX; // o pulso "salta" 1 px no batimento
        pulso(g, 'a', cx - vao, cy - pulsa(la), { lit: junto || la > 0.4, cor: junto ? OURO : CA });
        pulso(g, 'b', cx + vao, cy - pulsa(lb), { lit: junto || lb > 0.4, cor: junto ? OURO : CB });
      },
      { k, from: [0, 60], pixel: PIX, levels: 14 }
    );
  }

  // ---------------------------------------------------------------- o campo
  // Rumo ao gol norte. A câmera vai na frente dos dois, baixa e de lado (a nordeste),
  // recuando enquanto eles vêm: os dois inteiros, lado a lado, nunca um atrás do outro.
  // A vem por fora (a leste, mais perto da câmera), B por dentro.
  const PASSE = 58; // A solta a bola no espaço entre os dois
  const TOQUE = 128; // os dois chegam juntos na bola
  const ENCONTRO = [53.05, 10.5]; // onde a bola e os dois se encontram
  const corre = (f, passo = 3) => 1 + (Math.floor(f / passo) % 4) * 4;
  const posA = (t) => [lerp(53.75, ENCONTRO[0] + 0.3, ease(seg(t, 0, TOQUE - 4))), lerp(15.0, ENCONTRO[1] + 0.3, easeIO(seg(t, 0, TOQUE - 4)))];
  const posB = (t) => [lerp(52.3, ENCONTRO[0] - 0.3, ease(seg(t, 0, TOQUE - 4))), lerp(15.3, ENCONTRO[1] + 0.32, easeIO(seg(t, 0, TOQUE - 4)))];
  function bola(t) {
    if (t < PASSE) {
      const a = posA(t);
      return [a[0] - 0.1, a[1] - 0.3 - Math.abs(Math.sin(t * 0.3)) * 0.12, 0.05];
    }
    if (t < TOQUE) {
      const a = posA(PASSE);
      const q = seg(t, PASSE, TOQUE);
      // rolando para o espaço, devagar no fim (os dois chegam juntos)
      return [lerp(a[0] - 0.1, ENCONTRO[0], ease(q)), lerp(a[1] - 0.3, ENCONTRO[1], ease(q)), 0.05];
    }
    // o chute dos dois: sai forte e sobe para o ângulo
    const q = seg(t, TOQUE + 4, TOQUE + 30);
    return [lerp(ENCONTRO[0], 53.6, q), lerp(ENCONTRO[1], 7.2, easeIn(q) * 0.4 + q * 0.6), 0.06 + q * 0.6 + Math.sin(q * Math.PI) * 0.2];
  }

  const def = R('duo_ressonancia', {
    titulo: 'RESSONÂNCIA',
    musica: 'epic',
    leitura: 0.75,
    tarja: 0.1,
    grao: 0.05,
    vinheta: 0.45,
    cenario(K) {
      K.expo(0.98);
    },
    planos: [
      // 1 · UM QUADRO, DOIS PULSOS: o quadro largo por cima do campo; as luzes se alcançam
      {
        id: 'pulsos',
        dur: 140,
        cena(K, S) {
          const t = S.t;
          // os dois parados lado a lado, de frente para o gol; a câmera dá a volta devagar
          const q = easeIO(seg(t, 0, S.dur));
          const a = lerp(0.5, 0.15, q);
          K.cam([53 + Math.sin(a) * 3.6, lerp(0.7, 0.62, q), 13.4 + Math.cos(a) * 3.6], [53, 0.55, 13.0], 44);
          const ouro = t >= SYNC ? [1.2, 1.15, 0.95] : null;
          lado(K, 'a', { x: 53.45, y: 13.05, face: [53.3, 8], light: ouro || [1.0, 1.1, 1.22] });
          lado(K, 'b', { x: 52.55, y: 13.05, face: [52.7, 8], light: ouro || [1.22, 1.04, 1.06] });
        },
        quadros: [
          {
            em: 4,
            ate: 140,
            desenha(ctx, S, k, t) {
              quadroPulsos(ctx, S, k, t);
            }
          }
        ],
        efeitos: [{ tipo: 'flash', em: SYNC, ate: SYNC + 8, forca: 0.7, cor: OURO }],
        sons: BATE_A.slice(0, 3)
          .map((b, i) => ({ em: b, id: 'a' + i, fn: () => window.SFX?.blip?.(330) }))
          .concat(BATE_B.slice(0, 3).map((b, i) => ({ em: b, id: 'b' + i, fn: () => window.SFX?.blip?.(392) })))
          .concat([{ em: SYNC, fn: () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square') }])
      },
      // 2 · O PASSE E O CHUTE DOS DOIS: ação limpa, de lado; termina no contato
      {
        id: 'ataque',
        dur: 160,
        // a pausa de 4 quadros no contato (só o tempo da ação para; sem quadro de impacto)
        lento: [{ em: TOQUE, ate: TOQUE + 4, fator: 0, rampa: 0 }],
        cena(K, S, st) {
          const t = S.A;
          const c = dupla();
          const pa = posA(t);
          const pb = posB(t);
          const chute = t >= TOQUE - 10;
          const bateu = t >= TOQUE;
          const pose = (who) => (bateu ? 'shoot' : chute ? 'windup' : who === 'a' && t > PASSE - 8 && t < PASSE + 4 ? 'shoot' : 'run');
          const anA = pose('a');
          const anB = pose('b');
          lado(K, 'a', { x: pa[0], y: pa[1], face: [ENCONTRO[0], 6.6], anim: anA, frame: anA === 'run' ? corre(S.f) : 1, light: [1.0, 1.1, 1.22] });
          lado(K, 'b', { x: pb[0], y: pb[1], face: [ENCONTRO[0], 6.6], anim: anB, frame: anB === 'run' ? corre(S.f + 2) : 1, light: [1.22, 1.04, 1.06] });
          // o marcador vem correndo atrás do A e se joga no carrinho tarde: o passe já saiu e ele
          // fica no chão, para trás (longe da câmera)
          const sl = seg(t, PASSE - 14, PASSE + 10);
          const rp = sl > 0 ? [lerp(54.0, 53.75, ease(sl)), lerp(15.3, 14.3, ease(sl))] : [lerp(54.4, 54.0, seg(t, 0, PASSE - 14)), lerp(17.2, 15.3, seg(t, 0, PASSE - 14))];
          K.actor(c.rival, { id: 'rv', x: rp[0], y: rp[1], face: [pa[0], pa[1]], anim: sl > 0.05 ? 'slide' : 'run', frame: sl > 0.05 ? undefined : corre(S.f + 1), opts: sl > 0.05 ? { animTime: Math.min(15, sl * 22) } : undefined });
          const b = bola(t);
          K.ball(b[0], b[1], b[2]);
          // na frente deles, baixa, recuando no mesmo passo (eles crescem só um pouco)
          const q = easeIO(seg(S.t, 0, S.dur));
          const cy = (posA(t)[1] + posB(t)[1]) / 2;
          K.cam([lerp(55.5, 55.15, q), lerp(0.55, 0.45, q), cy - lerp(3.3, 2.9, q)], [53.0, 0.45, cy + 0.2], lerp(46, 44, q));
          const pe = [ENCONTRO[0], ENCONTRO[1], 0.1];
          st.pe = R.ponto(pe[0], pe[1], pe[2]);
          st.bola = R.ponto(b[0], b[1], b[2]);
          st.bateu = bateu;
          st.t = t;
        },
        efeitos: [
          { tipo: 'tremor', em: TOQUE, ate: TOQUE + 22, forca: 0.4, amp: 0.05 },
          { tipo: 'linhas', modo: 'radial', em: TOQUE, ate: TOQUE + 8, alvo: 'pe', forca: 0.35, cor: '#fef9c3' }
        ],
        sons: [
          { em: PASSE, som: 'passe' },
          { em: PASSE - 10, som: 'carrinho' },
          { em: TOQUE, fn: () => window.SFX?.kick?.(1) }
        ],
        depois(ctx, S, K, st) {
          // as duas cores saindo do pé e virando um rastro dourado só
          if (!st.bateu || !st.pe || !st.bola || !CE.luckStreak) return;
          const k = 1 - seg(st.t, TOQUE + 20, TOQUE + 34);
          if (k <= 0) return;
          CE.luckStreak(ctx, st.pe.x - 6, st.pe.y, st.bola.x, st.bola.y, 2, 14, '56,189,248', 0.75 * k);
          CE.luckStreak(ctx, st.pe.x + 6, st.pe.y + 4, st.bola.x, st.bola.y, 2, 14, '251,113,133', 0.75 * k);
          CE.cineGlow(ctx, st.bola.x, st.bola.y, 60, 'rgba(253,224,71,0.55)', k);
        }
      }
    ]
  });
  // o estádio: o da partida que está rolando (no Modo Dupla) ou o holográfico na história
  Object.defineProperty(def, 'theme', {
    configurable: true,
    enumerable: true,
    get() {
      const ME = window.MatchEngine;
      return ME && ME.active && CE.ptdTheme ? CE.ptdTheme('bluelock_holo') : 'bluelock_holo';
    }
  });
})();
